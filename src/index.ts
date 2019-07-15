import BPromise from 'bluebird';
import fse from 'fs-extra';
import WebSocket from 'ws';
import http from 'http';
import path from 'path';
import _ from 'lodash';
import assert from 'assert';
import Koa from 'koa';
import Router from 'koa-router';
import Market from './market';
import { MsgFromAgent, Config } from './interfaces';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

enum States {
    CONSTRUCTED,
    STARTED,
    STOPPING,
}

class QuoteCenter {
    private state = States.CONSTRUCTED;
    // private stopping: (() => void) | undefined = undefined;

    private httpServer = http.createServer();
    private upServer = new WebSocket.Server({ server: this.httpServer });
    private downServer = new Koa();
    private markets = new Map<string, Market>();

    constructor() {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
        this.upServer.on('connection', (quoteAgent) => {
            (<any>global).t.log('connection');
            quoteAgent.on('message', (message: string) => {
                const data: MsgFromAgent = JSON.parse(message);
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
                // (<any>global).t.log(data);
                // (<any>global).t.log(marketName);
            });
        });

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

    start(/* stopping = () => { } */): Promise<void> {
        // this.stopping = stopping;
        // console.log('listening');
        this.state = States.STARTED;
        return new BPromise(resolve =>
            void this.httpServer.listen(config.PORT, resolve)
        );
    }

    stop(): void {
        assert(this.state === States.STARTED);
        this.state = States.STOPPING;
        // console.log('stopping');
        // this.stopping!();
        this.httpServer.close();
        this.markets.forEach(market => market.destructor());
    }
}

export default QuoteCenter;