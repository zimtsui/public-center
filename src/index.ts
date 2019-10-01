import Autonomous from 'autonomous';
import WebSocket from 'ws';
import http from 'http';
import Market from './market';
import Koa from 'koa';
import Router from 'koa-router';
import fse from 'fs-extra';
import path from 'path';
import _ from 'lodash';
import {
    QuoteDataFromAgentToCenter as QDFATC,
    Config,
} from './interfaces';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

class QuoteCenter extends Autonomous {
    private httpServer = http.createServer();
    private upServer = new WebSocket.Server({ server: this.httpServer });
    private downServer = new Koa();
    private markets = new Map<string, Market>();

    private configureHttpServer(): void {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }

    private configureUpServer(): void {
        this.upServer.on('connection', (quoteAgent) => {
            quoteAgent.on('message', (message: string) => {
                const data: QDFATC = JSON.parse(message);

                const marketName = _.toLower(
                    `${data.exchange}.${data.pair[0]}.${data.pair[1]}`);
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
    }

    private configureDownServer(): void {
        this.downServer.use(async (ctx, next) => {
            ctx.marketName = _.toLower(`${ctx.query.exchange}.${ctx.query.pair}`);
            await next();
        });

        const router = new Router();
        router.get('/trades', async (ctx, next) => {
            const market = this.markets.get(ctx.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getTrades(ctx.query.from);
            } else {
                ctx.status = 404;
            }
            await next();
        });
        router.get('/orderbook', async (ctx, next) => {
            const market = this.markets.get(ctx.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getOrderbook(ctx.query.depth);
            } else {
                ctx.status = 404;
            }
            await next();
        });

        this.downServer.use(router.routes());
        this.httpServer.on('request', this.downServer.callback());
    }

    constructor() {
        super();
        this.configureHttpServer();
        this.configureDownServer();
        this.configureUpServer();
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