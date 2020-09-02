import Startable from 'startable';
import http from 'http';
import Market from './market';
import Koa from 'koa';
import Router from 'koa-router';
import _ from 'lodash';
import Filter from 'koa-ws-filter';
import EventEmitter from 'events';
import cors from '@koa/cors';
import config from './config';
const ACTIVE_CLOSE = 'public-center';
class PublicCenter extends Startable {
    constructor() {
        super();
        // private httpServer = enabledDestroy(http.createServer());
        this.httpServer = http.createServer();
        this.filter = new Filter();
        this.wsRouter = new Router();
        this.httpRouter = new Router();
        this.koa = new Koa();
        this.markets = new Map();
        this.onlineMarkets = new Set();
        this.broadcast = new EventEmitter();
        this.configureHttpServer();
        this.addMarketNameToContext();
        this.configureHttpDownload();
        this.configureWsUpload();
        this.configureWsDownload();
        this.filter.http(cors());
        this.filter.http(this.httpRouter.routes());
        this.filter.ws(this.wsRouter.routes());
        this.koa.use(this.filter.filter());
        this.koa.use((ctx, next) => { ctx.status = 404; });
        this.httpServer.on('request', this.koa.callback());
    }
    configureHttpServer() {
        this.httpServer.timeout = config.HTTP_TIMEOUT;
        this.httpServer.keepAliveTimeout = config.HTTP_KEEP_ALIVE_TIMEOUT;
    }
    addMarketNameToContext() {
        const f = async (ctx, next) => {
            ctx.state.marketName = _.toLower(`${ctx.params.exchange}/${ctx.params.instrument}/${ctx.params.currency}`);
            await next();
        };
        this.httpRouter.all('/:exchange/:instrument/:currency/:suffix*', f);
        this.wsRouter.all('/:exchange/:instrument/:currency/:suffix*', f);
    }
    configureWsUpload() {
        this.wsRouter.all('/:exchange/:instrument/:currency', async (ctx, next) => {
            try {
                const marketName = ctx.state.marketName;
                if (this.onlineMarkets.has(marketName)) {
                    ctx.status = 409;
                    ctx.message = 'Already online.';
                    return;
                }
                const publicAgent = await ctx.state.upgrade();
                this.onlineMarkets.add(marketName);
                this.broadcast.emit(`${marketName}/online`, true);
                console.log(`${marketName} online`);
                const market = new Market();
                await market.start();
                this.markets.set(marketName, market);
                publicAgent.on('close', async (code, reason) => {
                    try {
                        await market.stop();
                        this.broadcast.emit(`${marketName}/online`, false);
                        if (reason !== ACTIVE_CLOSE)
                            console.log(`${marketName} offline`);
                        this.onlineMarkets.delete(marketName);
                    }
                    catch (err) {
                        this.stop(err);
                    }
                });
                publicAgent.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        const market = this.markets.get(marketName);
                        if (data.trades) {
                            market.updateTrades(data.trades);
                            this.broadcast.emit(`${marketName}/trades`, data.trades);
                        }
                        if (data.orderbook) {
                            market.updateOrderbook(data.orderbook);
                            this.broadcast.emit(`${market}/orderbook`, data.orderbook);
                        }
                    }
                    catch (err) {
                        this.stop(err);
                    }
                });
            }
            catch (err) {
                this.stop(err);
            }
        });
    }
    configureHttpDownload() {
        this.httpRouter.get('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const marketName = ctx.state.marketName;
            if (!this.onlineMarkets.has(marketName)) {
                ctx.status = 404;
                return;
            }
            const market = this.markets.get(marketName);
            ctx.body = market.getTrades(ctx.query.from);
        });
        this.httpRouter.get('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const marketName = ctx.state.marketName;
            if (!this.onlineMarkets.has(marketName)) {
                ctx.status = 404;
                return;
            }
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
            const { marketName } = ctx.state;
            if (!this.onlineMarkets.has(marketName)) {
                ctx.status = 404;
                return;
            }
            const downloader = await ctx.state.upgrade();
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
            const { marketName } = ctx.state;
            if (!this.onlineMarkets.has(marketName)) {
                ctx.status = 404;
                return;
            }
            const downloader = await ctx.state.upgrade();
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
            const { marketName } = ctx.state;
            if (!this.onlineMarkets.has(marketName)) {
                ctx.status = 404;
                return;
            }
            const downloader = await ctx.state.upgrade();
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
    _start() {
        return new Promise(resolve => {
            this.httpServer.listen(config.PORT, resolve);
            this.httpServer.on('error', this.stop.bind(this));
        });
    }
    // protected async _stop(): Promise<void> {
    //     return new Promise(resolve =>
    //         void this.httpServer.destroy((err?: Error) => {
    //             if (err) console.error(err);
    //             resolve();
    //         }));
    // }
    // it has to wait for keep-alive connections and transfering connections to close
    async _stop() {
        await Promise.all([
            this.filter.close(config.WS_CLOSE_TIMEOUT, ACTIVE_CLOSE),
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