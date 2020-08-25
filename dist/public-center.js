import Startable from 'startable';
import http from 'http';
import Market from './market';
import Koa from 'koa';
import Router from 'koa-router';
import _ from 'lodash';
import Filter from 'koa-ws-filter';
import EventEmitter from 'events';
import cors from '@koa/cors';
import readConfig from './read-config';
const config = readConfig();
const ACTIVE_CLOSE = 'public-center';
class PublicCenter extends Startable {
    constructor() {
        super();
        this.httpServer = http.createServer();
        this.filter = new Filter();
        this.wsRouter = new Router();
        this.httpRouter = new Router();
        this.koa = new Koa();
        this.markets = new Map();
        this.onlineMarkets = new Set();
        this.broadcast = new EventEmitter();
        this.configureHttpServer();
        this.addMarketName();
        this.configureHttpDownload();
        this.configureUpload();
        this.configureWsDownload();
        this.filter.http(cors());
        this.filter.http(this.httpRouter.routes());
        this.filter.ws(this.wsRouter.routes());
        this.koa.use(this.filter.filter());
        this.koa.use((ctx, next) => { ctx.status = 404; });
        this.httpServer.on('request', this.koa.callback());
    }
    addMarketName() {
        const f = async (ctx, next) => {
            const marketName = _.toLower(`${ctx.params.exchange}/${ctx.params.instrument}/${ctx.params.currency}`);
            if (this.onlineMarkets.has(marketName)) {
                ctx.state.marketName = marketName;
                await next();
            }
            else
                ctx.status = 404;
        };
        this.httpRouter.all('/:exchange/:instrument/:currency/:suffix+', f);
        this.wsRouter.all('/:exchange/:instrument/:currency/:suffix+', f);
    }
    configureUpload() {
        this.wsRouter.all('/:exchange/:instrument/:currency', async (ctx, next) => {
            const publicAgent = await ctx.upgrade();
            const marketName = ctx.state.marketName;
            this.onlineMarkets.add(marketName);
            this.broadcast.emit(`${marketName}/online`, true);
            console.log(`${marketName} online`);
            publicAgent.on('close', (code, reason) => {
                this.onlineMarkets.delete(marketName);
                this.broadcast.emit(`${marketName}/online`, false);
                if (reason !== ACTIVE_CLOSE)
                    console.log(`${marketName} offline: ${code}`);
            });
            publicAgent.on('message', (message) => {
                const data = JSON.parse(message);
                if (!this.markets.has(marketName))
                    this.markets.set(marketName, new Market(config));
                const market = this.markets.get(marketName);
                if (data.trades) {
                    market.updateTrades(data.trades);
                    this.broadcast.emit(`${marketName}/trades`, data.trades);
                }
                if (data.orderbook) {
                    market.updateOrderbook(data.orderbook);
                    this.broadcast.emit(`${market}/orderbook`, data.orderbook);
                }
            });
        });
    }
    configureHttpDownload() {
        this.httpRouter.get('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const marketName = ctx.state.marketName;
            const market = this.markets.get(marketName);
            ctx.body = market.getTrades(ctx.query.from);
        });
        this.httpRouter.get('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const marketName = ctx.state.marketName;
            const market = this.markets.get(marketName);
            const orderbook = market.getOrderbook(ctx.query.depth);
            if (Number.isFinite(orderbook.time))
                ctx.body = orderbook;
            else
                ctx.status = 404;
        });
    }
    configureWsDownload() {
        this.wsRouter.all('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            const { marketName } = ctx.state;
            function onData(trades) {
                const message = JSON.stringify(trades);
                downloader.send(message);
            }
            this.broadcast.on(`${marketName}/trades`, onData);
            downloader.on('error', console.error);
            downloader.on('close', () => {
                this.broadcast.off(`${marketName}/trades`, onData);
            });
        });
        this.wsRouter.all('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            const { marketName } = ctx.state;
            function onData(orderbook) {
                const orderbookDepthLtd = {
                    bids: orderbook.bids.slice(0, ctx.query.depth),
                    asks: orderbook.asks.slice(0, ctx.query.depth),
                    time: orderbook.time,
                };
                const message = JSON.stringify(orderbookDepthLtd);
                downloader.send(message);
            }
            this.broadcast.on(`${marketName}/orderbook`, onData);
            downloader.on('error', console.error);
            downloader.on('close', () => {
                this.broadcast.off(`${marketName}/orderbook`, onData);
            });
        });
        this.wsRouter.all('/:exchange/:instrument/:currency/online', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            const { marketName } = ctx.state;
            const message = JSON.stringify(this.onlineMarkets.has(marketName));
            downloader.send(message);
            function onData(online) {
                const message = JSON.stringify(online);
                downloader.send(message);
            }
            this.broadcast.on(`${marketName}/online`, onData);
            downloader.on('error', console.error);
            downloader.on('close', () => {
                this.broadcast.off(`${marketName}/online`, onData);
            });
        });
    }
    configureHttpServer() {
        this.httpServer.timeout = config.HTTP_TIMEOUT;
        this.httpServer.keepAliveTimeout = config.HTTP_KEEP_ALIVE_TIMEOUT;
    }
    _start() {
        return new Promise(resolve => {
            this.httpServer.listen(config.PORT, resolve);
            this.httpServer.on('error', this.stop.bind(this));
        });
    }
    // it has to wait for keep-alive connections and transfering connections to close
    async _stop() {
        await Promise.all([
            this.filter.close(1000, ACTIVE_CLOSE),
            new Promise(resolve => {
                this.httpServer.close((err) => {
                    if (err)
                        console.error(err);
                    resolve();
                });
            }),
        ]);
    }
}
export { PublicCenter as default, PublicCenter, };
//# sourceMappingURL=public-center.js.map