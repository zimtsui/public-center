/**
 * unreusable
 */

import Bluebird from 'bluebird';
import fse from 'fs-extra';
import WebSocket from 'ws';
import http from 'http';
import path from 'path';
import _ from 'lodash';
import assert from 'assert';
import Koa from 'koa';
import Router from 'koa-router';
import Market from './market';
import { QuoteDataFromAgentToCenter, Config } from './interfaces';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

enum States {
    CONSTRUCTED,
    STARTING,
    STARTED,
    STOPPING,
    STOPPED,
}

class QuoteCenter {
    private state = States.CONSTRUCTED;
    private httpServer = http.createServer();
    private upServer = new WebSocket.Server({ server: this.httpServer });
    private downServer = new Koa();
    private markets = new Map<string, Market>();

    constructor() {
        this.configureHttpServer();
        this.configureDownServer();
        this.configureUpServer();
    }

    private started: Promise<void> | undefined;
    start(): Promise<void> {
        this.started = this._start()
            .catch(err => {
                this.stop();
                throw err;
            });
        return this.started;
    }

    private _start(): Promise<void> {
        assert(this.state === States.CONSTRUCTED);
        this.state = States.STARTED;
        return new Bluebird(resolve =>
            void this.httpServer.listen(config.PORT, resolve)
        );
    }

    private stopped: Promise<void> | undefined;
    stop(): Promise<void> {
        if (this.state === States.STOPPING)
            return this.stopped!;
        if (this.state === States.STARTING)
            return this.started!
                .then(() => void this.stop())
                .catch(() => void this.stop());

        this.stopped = this._stop();
        return this.stopped;
    }

    private _stop(): Promise<void> {
        this.state = States.STOPPING;
        this.markets.forEach(market => market.destructor());
        return new Promise((resolve, reject) => void this.httpServer.close(err => {
            if (err) reject(err); else resolve();
        }));
    }

    private configureHttpServer(): void {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }

    private configureUpServer(): void {
        this.upServer.on('connection', (quoteAgent) => {
            quoteAgent.on('message', (message: string) => {
                const data: QuoteDataFromAgentToCenter = JSON.parse(message);

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
}

export default QuoteCenter;