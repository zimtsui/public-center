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
    PublicDataFromAgentToCenter as PDFATC,
    Config,
} from './interfaces';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

class PublicCenter extends Autonomous {
    private httpServer = http.createServer();
    private filter = new Filter();
    private wsRouter = new Router();
    private httpRouter = new Router();
    private koa = new Koa();
    private markets = new Map<string, Market>();
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
            const publicAgent = await ctx.upgrade();
            const { marketName } = ctx.state;

            publicAgent.on('message', (message: string) => {
                const data: PDFATC = JSON.parse(message);
                if (!this.markets.has(marketName)) {
                    this.markets.set(marketName, new Market(() => {
                        this.markets.delete(marketName);
                    }));
                }
                const market = this.markets.get(marketName);

                if (data.trades) market!.updateTrades(data.trades);
                if (data.orderbook) market!.updateOrderbook(data.orderbook);
                this.realTime.emit(marketName, data);
            });
        });
    }

    private configureHttpDownload(): void {
        this.httpRouter.get('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const { marketName } = ctx.state;

            const market = this.markets.get(marketName);
            if (market) {
                ctx.body = market.getTrades(ctx.query.from);
            } else {
                ctx.status = 404;
            }
            await next();
        });

        this.httpRouter.get('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const { marketName } = ctx.state;

            const market = this.markets.get(marketName);
            if (market) {
                ctx.body = market.getOrderbook(ctx.query.depth);
            } else {
                ctx.status = 404;
            }
            await next();
        });
    }

    private configureWsDownload(): void {
        this.wsRouter.all('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            const { marketName } = ctx.state;

            function onData(data: PDFATC): void {
                if (!data.trades) return;
                const message = JSON.stringify(data.trades);
                downloader.send(message, (err?: Error) => {
                    if (err) console.error(err);
                });
            }
            this.realTime.on(marketName, onData);
            downloader.on('error', console.error);

            downloader.on('close', () => {
                this.realTime.off(marketName, onData);
            });
        });

        this.wsRouter.all('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            const { marketName } = ctx.state;

            function onData(data: PDFATC): void {
                if (!data.orderbook) return;
                const message = JSON.stringify(data.orderbook);
                downloader.send(message, (err?: Error) => {
                    if (err) console.error(err);
                });
            }
            this.realTime.on(marketName, onData);
            downloader.on('error', console.error);

            downloader.on('close', () => {
                this.realTime.off(marketName, onData);
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

    protected async _stop(): Promise<void> {
        await this.filter.close();
        this.markets.forEach(market => market.destructor());
        await new Promise<void>((resolve, reject) =>
            void this.httpServer.close(err => {
                if (err) reject(err); else resolve();
            }));
    }
}

export default PublicCenter;
export { PublicCenter };