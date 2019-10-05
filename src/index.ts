import Autonomous from 'autonomous';
// import WebSocket from 'ws';
import http from 'http';
import Market from './market';
import Koa from 'koa';
import Router from 'koa-router';
import fse from 'fs-extra';
import path from 'path';
import _ from 'lodash';
import Filter from 'koa-ws-filter';
import {
    QuoteDataFromAgentToCenter as QDFATC,
    Config,
} from './interfaces';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

class QuoteCenter extends Autonomous {
    private httpServer = http.createServer();
    private filter = new Filter();
    private koa = new Koa();
    private markets = new Map<string, Market>();

    constructor() {
        super();
        this.configureHttpDownload();
        this.configureUpload();
        this.configureHttpServer();
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }

    private configureUpload(): void {
        const router = new Router();
        router.all('/:exchange/:pair/', async (ctx, next) => {
            const quoteAgent = await ctx.upgrade();
            quoteAgent.on('message', (message: string) => {
                const data: QDFATC = JSON.parse(message);

                const marketName = _.toLower(
                    `${ctx.params.exchange}/${ctx.params.pair}`);
                if (!this.markets.has(marketName)) {
                    this.markets.set(marketName, new Market(() => {
                        this.markets.delete(marketName);
                    }));
                }
                const market = this.markets.get(marketName);

                if (data.trades) market!.updateTrades(data.trades);
                if (data.orderbook) market!.updateOrderbook(data.orderbook);
            });
        });
        this.filter.ws(router.routes());
    }

    private configureHttpDownload(): void {
        const router = new Router();

        router.get('/:exchange/:pair/trades', async (ctx, next) => {
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

        router.get('/:exchange/:pair/orderbook', async (ctx, next) => {
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

        this.filter.http(router.routes());
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