"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const autonomous_1 = require("autonomous");
const http_1 = __importDefault(require("http"));
const market_1 = __importDefault(require("./market"));
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const koa_ws_filter_1 = __importDefault(require("koa-ws-filter"));
const events_1 = __importDefault(require("events"));
const cors_1 = __importDefault(require("@koa/cors"));
const config = fs_extra_1.readJsonSync(path_1.default.join(__dirname, '../cfg/config.json'));
const ACTIVE_CLOSE = 'public-center';
class PublicCenter extends autonomous_1.Autonomous {
    constructor() {
        super();
        this.httpServer = http_1.default.createServer();
        this.filter = new koa_ws_filter_1.default();
        this.wsRouter = new koa_router_1.default();
        this.httpRouter = new koa_router_1.default();
        this.koa = new koa_1.default();
        this.markets = new Map();
        this.onlineMarkets = new Set();
        this.realTime = new events_1.default();
        this.configureHttpServer();
        this.addMarketName();
        this.configureHttpDownload();
        this.configureUpload();
        this.configureWsDownload();
        this.filter.http(cors_1.default());
        this.filter.http(this.httpRouter.routes());
        this.filter.ws(this.wsRouter.routes());
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }
    addMarketName() {
        async function f(ctx, next) {
            ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.instrument}/${ctx.params.currency}`);
            await next();
        }
        this.httpRouter.all('/:exchange/:instrument/:currency/:suffix*', f);
        this.wsRouter.all('/:exchange/:instrument/:currency/:suffix*', f);
    }
    configureUpload() {
        this.wsRouter.all('/:exchange/:instrument/:currency', async (ctx, next) => {
            const publicAgent = await ctx.upgrade();
            const marketName = ctx.state.marketName;
            this.onlineMarkets.add(marketName);
            const data = { online: true };
            this.realTime.emit(marketName, data);
            console.log(`${marketName} online`);
            publicAgent.on('close', (code, reason) => {
                this.onlineMarkets.delete(marketName);
                const data = { online: false };
                this.realTime.emit(marketName, data);
                if (reason !== ACTIVE_CLOSE)
                    console.log(`${marketName} offline: ${code}`);
            });
            publicAgent.on('message', (message) => {
                const data = JSON.parse(message);
                if (!this.markets.has(marketName)) {
                    this.markets.set(marketName, new market_1.default(config));
                }
                const market = this.markets.get(marketName);
                if (data.trades)
                    market.updateTrades(data.trades);
                if (data.orderbook)
                    market.updateOrderbook(data.orderbook);
                this.realTime.emit(marketName, data);
            });
        });
    }
    configureHttpDownload() {
        this.httpRouter.get('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const { marketName } = ctx.state;
            if (this.onlineMarkets.has(marketName)) {
                const market = this.markets.get(marketName);
                ctx.body = market.getTrades(ctx.query.from);
            }
            else {
                ctx.status = 404;
            }
            await next();
        });
        this.httpRouter.get('/:exchange/:instrument/:currency/orderbook', async (ctx, next) => {
            const { marketName } = ctx.state;
            if (this.onlineMarkets.has(marketName)) {
                const market = this.markets.get(marketName);
                ctx.body = market.getOrderbook(ctx.query.depth);
            }
            else {
                ctx.status = 404;
            }
            await next();
        });
    }
    configureWsDownload() {
        this.wsRouter.all('/:exchange/:instrument/:currency/trades', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            const { marketName } = ctx.state;
            function onData(data) {
                if (!data.trades)
                    return;
                const message = JSON.stringify(data.trades);
                downloader.send(message);
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
            function onData(data) {
                if (!data.orderbook)
                    return;
                const message = JSON.stringify(data.orderbook);
                downloader.send(message);
            }
            this.realTime.on(marketName, onData);
            downloader.on('error', console.error);
            downloader.on('close', () => {
                this.realTime.off(marketName, onData);
            });
        });
        this.wsRouter.all('/:exchange/:instrument/:currency/online', async (ctx, next) => {
            const downloader = await ctx.upgrade();
            const { marketName } = ctx.state;
            const message = JSON.stringify(this.onlineMarkets.has(marketName));
            downloader.send(message);
            function onData(data) {
                if (typeof data.online !== 'boolean')
                    return;
                const message = JSON.stringify(data.online);
                downloader.send(message);
            }
            this.realTime.on(marketName, onData);
            downloader.on('error', console.error);
            downloader.on('close', () => {
                this.realTime.off(marketName, onData);
            });
        });
    }
    configureHttpServer() {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }
    _start() {
        return new Promise(resolve => void this.httpServer.listen(config.PORT, resolve));
    }
    async _stop() {
        await Promise.all([
            this.filter.close(1000, ACTIVE_CLOSE),
            new Promise((resolve, reject) => void this.httpServer.close(err => {
                if (err)
                    reject(err);
                else
                    resolve();
            })),
        ]);
    }
}
exports.PublicCenter = PublicCenter;
exports.default = PublicCenter;
//# sourceMappingURL=index.js.map