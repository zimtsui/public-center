import BPromise from 'bluebird';
import fse from 'fs-extra';
import WebSocket from 'ws';
import http from 'http';
import _ from 'lodash';
import Koa from 'koa';
import Router from 'koa-router';
import Market from './market';
import { MsgFromAgent, Config } from './interfaces';

class QuoteCenter {
    private stopping: ((err?: Error) => void) | undefined = undefined;
    private config: Config = fse.readJsonSync('../cfg/config.json');
    private httpServer = http.createServer();
    private wsServer = new WebSocket.Server({ server: this.httpServer });
    private koa = new Koa();
    private router = new Router();
    private markets = new Map<string, Market>();

    constructor() {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
        this.wsServer.on('connection', (quoteAgent) => {
            quoteAgent.on('message', (message: string) => {
                const data: MsgFromAgent = JSON.parse(message);
                const marketName = _.toLower(
                    `${data.exchange}.${data.pair[0]}.${data.pair[1]}`
                );
                if (!this.markets.has(marketName)) {
                    this.markets.set(marketName, new Market(err => {
                        this.markets.delete(marketName);
                        if (err) this.stop(err);
                    }));
                }
                const market = this.markets.get(marketName);
                if (data.trades) market!.updateTrades(data.trades);
                if (data.orderbook) market!.updateOrderbook(data.orderbook);
            });
        });

        this.koa.use(async (ctx, next) => {
            ctx.marketName = _.toLower(`${ctx.query.exchange}.${ctx.query.pair}`);
            await next();
        });

        this.router.get('/trades', async (ctx, next) => {
            const market = this.markets.get(ctx.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getTrades(ctx.query.from);
            } else {
                ctx.status = 404;
            }
            await next();
        });
        this.router.get('/orderbook', async (ctx, next) => {
            const market = this.markets.get(ctx.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getOrderbook(ctx.query.depth);
            } else {
                ctx.status = 404;
            }
            await next();
        });

        this.koa.use(this.router.routes());
        this.httpServer.on('request', this.koa.callback());
    }

    start(stopping: (err?: Error) => void = () => { }): Promise<void> {
        this.stopping = stopping;
        this.httpServer.listen(this.config.PORT);
        console.log('listening');
        return Promise.resolve();
    }

    async stop(err?: Error): Promise<void> {
        console.log('stopping');
        this.stopping!(err);
        await BPromise.promisify(this.httpServer.close.bind(this.httpServer))();
        await BPromise.all(
            [...this.markets.values()].map(market => market.destructor())
        );
    }
}

export default QuoteCenter;