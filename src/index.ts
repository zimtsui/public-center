import Autonomous from 'autonomous';
import http from 'http';
import Market from './market';
import Koa from 'koa';
import Router from 'koa-router';
import fse from 'fs-extra';
import path from 'path';
import _ from 'lodash';
import Filter from 'koa-ws-filter';
import EventEmitter from 'events';
import cors from '@koa/cors';
import {
    QuoteDataFromAgentToCenter as QDFATC,
    Config,
} from './interfaces';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

class QuoteCenter extends Autonomous {
    private httpServer = http.createServer();
    private filter = new Filter();
    private wsRouter = new Router();
    private httpRouter = new Router();
    private koa = new Koa();
    private markets = new Map<string, Market>();
    private realTime = new EventEmitter();

    constructor() {
        super();
        this.configureHttpDownload();
        this.configureUpload();
        this.configureHttpServer();
        this.configureWsDownload();

        this.filter.http(cors());
        this.filter.http(this.httpRouter.routes());
        this.filter.ws(this.wsRouter.routes());
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }

    private configureUpload(): void {
        this.wsRouter.all('/:exchange/:pair/', async (ctx, next) => {
            const quoteAgent = await ctx.upgrade();
            quoteAgent.on('message', (message: string) => {
                const data: QDFATC = JSON.parse(message);

                ctx.state.marketName = _.toLower(
                    `${ctx.params.exchange}/${ctx.params.pair}`);
                if (!this.markets.has(ctx.state.marketName)) {
                    this.markets.set(ctx.state.marketName, new Market(() => {
                        this.markets.delete(ctx.state.marketName);
                    }));
                }
                const market = this.markets.get(ctx.state.marketName);

                if (data.trades) market!.updateTrades(data.trades);
                if (data.orderbook) market!.updateOrderbook(data.orderbook);
                this.realTime.emit(ctx.state.marketName, data);
            });
        });
    }

    private configureHttpDownload(): void {
        this.httpRouter.get('/:exchange/:pair/trades', async (ctx, next) => {
            ctx.state.marketName = _.toLower(
                `${ctx.params.exchange}/${ctx.params.pair}`);
            const market = this.markets.get(ctx.state.marketName);
            if (market) {
                ctx.body = market.getTrades(ctx.query.from);
            } else {
                ctx.status = 404;
            }
            await next();
        });

        this.httpRouter.get('/:exchange/:pair/orderbook', async (ctx, next) => {
            ctx.state.marketName = _.toLower(
                `${ctx.params.exchange}/${ctx.params.pair}`);
            const market = this.markets.get(ctx.state.marketName);
            if (market) {
                ctx.body = market.getOrderbook(ctx.query.depth);
            } else {
                ctx.status = 404;
            }
            await next();
        });
    }

    private configureWsDownload(): void {
        this.wsRouter.all('/:exchange/:pair/trades', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            ctx.state.marketName = _.toLower(
                `${ctx.params.exchange}/${ctx.params.pair}`);
            function onData(data: QDFATC): void {
                if (!data.trades) return;
                const message = JSON.stringify(data.trades);
                downloader.send(message, (err?: Error) => {
                    if (err) console.error(err);
                });
            }
            this.realTime.on(ctx.state.marketName, onData);
            downloader.on('error', console.error);

            downloader.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        });

        this.wsRouter.all('/:exchange/:pair/orderbook', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            ctx.state.marketName = _.toLower(
                `${ctx.params.exchange}/${ctx.params.pair}`);
            function onData(data: QDFATC): void {
                if (!data.orderbook) return;
                const message = JSON.stringify(data.orderbook);
                downloader.send(message, (err?: Error) => {
                    if (err) console.error(err);
                });
            }
            this.realTime.on(ctx.state.marketName, onData);
            downloader.on('error', console.error);

            downloader.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        });
    }

    private configureHttpServer(): void {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }

    protected _start() {
        return new Promise<void>(resolve =>
            void this.httpServer.listen(config.PORT, resolve)
        );
    }

    protected _stop() {
        this.markets.forEach(market => market.destructor());
        return new Promise<void>((resolve, reject) =>
            void this.httpServer.close(err => {
                if (err) reject(err); else resolve();
            }));
    }
}

export default QuoteCenter;