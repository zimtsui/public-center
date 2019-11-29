import { Autonomous } from 'autonomous';
import http from 'http';
import Market from './market';
import Koa from 'koa';
import Router from 'koa-router';
import { readJsonSync } from 'fs-extra';
import path from 'path';
import _ from 'lodash';
import Filter from 'koa-ws-filter';
import EventEmitter from 'events';
import cors from '@koa/cors';
import WebSocket from 'ws';
import {
    DataFromPublicAgentToCenter as DFPATC,
    Trade,
    Config,
    Orderbook,
} from './interfaces';

const config: Config = readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

const ACTIVE_CLOSE = 'public-center';

class PublicCenter extends Autonomous {
    private httpServer = http.createServer();
    private filter = new Filter();
    private wsRouter = new Router();
    private httpRouter = new Router();
    private koa = new Koa();
    private markets = new Map<string, Market>();
    private onlineMarkets = new Set<string>();
    private realTime = new EventEmitter();

    constructor() {
        super();
        this.configureHttpServer();
        this.addMarketName();

        this.configureHttpDownload();
        this.configureUpload();
        this.configureWsDownload();

        this.filter.http(cors());
        this.filter.http(this.httpRouter.routes());
        this.filter.ws(this.wsRouter.routes());
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }

    private addMarketName(): void {
        async function f(
            ctx: Router.RouterContext, next: () => Promise<any>,
        ) {
            ctx.state.marketName = _.toLower(
                `${ctx.params.exchange
                }/${ctx.params.instrument
                }/${ctx.params.currency}`);
            await next();
        }
        this.httpRouter.all('/:exchange/:instrument/:currency/:suffix*', f);
        this.wsRouter.all('/:exchange/:instrument/:currency/:suffix*', f);
    }

    private configureUpload(): void {
        this.wsRouter.all('/:exchange/:instrument/:currency', async (ctx, next) => {
            const publicAgent = <WebSocket>await ctx.upgrade();
            const marketName = <string>ctx.state.marketName;
            this.onlineMarkets.add(marketName);

            this.realTime.emit(`${marketName}/online`, true);
            console.log(`${marketName} online`);

            publicAgent.on('close', (code, reason) => {
                this.onlineMarkets.delete(marketName);
                this.realTime.emit(`${marketName}/online`, false);
                if (reason !== ACTIVE_CLOSE)
                    console.log(`${marketName} offline: ${code}`);
            });

            publicAgent.on('message', (message: string) => {
                const data = <DFPATC>JSON.parse(message);
                if (!this.markets.has(marketName)) {
                    this.markets.set(marketName, new Market(config));
                }
                const market = this.markets.get(marketName)!;

                if (data.trades) {
                    market.updateTrades(data.trades);
                    this.realTime.emit(`${marketName}/trades`, data.trades);
                }
                if (data.orderbook) {
                    market.updateOrderbook(data.orderbook);
                    this.realTime.emit(`${market}/orderbook`, data.orderbook);
                }
            });

            await next();
        });
    }

    private configureHttpDownload(): void {
        this.httpRouter.get('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const { marketName } = ctx.state;

            if (this.onlineMarkets.has(marketName)) {
                const market = this.markets.get(marketName)!;
                ctx.body = market.getTrades(ctx.query.from);
            } else {
                ctx.status = 404;
            }
            await next();
        });

        this.httpRouter.get('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const { marketName } = ctx.state;

            if (this.onlineMarkets.has(marketName)) {
                const market = this.markets.get(marketName)!;
                const orderbook = market.getOrderbook(ctx.query.depth);
                if (Number.isFinite(orderbook.time))
                    ctx.body = orderbook;
                else
                    ctx.status = 404;
            } else {
                ctx.status = 404;
            }
            await next();
        });
    }

    private configureWsDownload(): void {
        this.wsRouter.all('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const downloader = <WebSocket>await ctx.upgrade();
            const { marketName } = ctx.state;

            function onData(trades: Trade[]): void {
                const message = JSON.stringify(trades);
                downloader.send(message);
            }
            this.realTime.on(`${marketName}/trades`, onData);
            downloader.on('error', console.error);

            downloader.on('close', () => {
                this.realTime.off(`${marketName}/trades`, onData);
            });

            await next();
        });

        this.wsRouter.all('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const downloader = <WebSocket>await ctx.upgrade();
            const { marketName } = ctx.state;

            function onData(orderbook: Orderbook): void {
                const orderbookDepthLtd: Orderbook = {
                    bids: orderbook.bids.slice(0, ctx.query.depth),
                    asks: orderbook.asks.slice(0, ctx.query.depth),
                    time: orderbook.time,
                }
                const message = JSON.stringify(orderbookDepthLtd);
                downloader.send(message);
            }
            this.realTime.on(`${marketName}/orderbook`, onData);
            downloader.on('error', console.error);

            downloader.on('close', () => {
                this.realTime.off(`${marketName}/orderbook`, onData);
            });

            await next();
        });

        this.wsRouter.all('/:exchange/:instrument/:currency/online', async (ctx, next) => {
            const downloader = <WebSocket>await ctx.upgrade();
            const { marketName } = ctx.state;

            const message = JSON.stringify(
                this.onlineMarkets.has(marketName)
            );
            downloader.send(message);

            function onData(online: boolean): void {
                const message = JSON.stringify(online);
                downloader.send(message);
            }
            this.realTime.on(`${marketName}/online`, onData);
            downloader.on('error', console.error);

            downloader.on('close', () => {
                this.realTime.off(`${marketName}/online`, onData);
            });

            await next();
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

    protected async _stop(): Promise<void> {
        await Promise.all([
            this.filter.close(1000, ACTIVE_CLOSE),
            new Promise<void>((resolve, reject) =>
                void this.httpServer.close(err => {
                    if (err) reject(err); else resolve();
                })),
        ]);
    }
}

export default PublicCenter;
export { PublicCenter };