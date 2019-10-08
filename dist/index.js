"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const autonomous_1 = __importDefault(require("autonomous"));
const http_1 = __importDefault(require("http"));
const market_1 = __importDefault(require("./market"));
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const koa_ws_filter_1 = __importDefault(require("koa-ws-filter"));
const events_1 = __importDefault(require("events"));
const cors_1 = __importDefault(require("@koa/cors"));
const config = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../cfg/config.json'));
class QuoteCenter extends autonomous_1.default {
    constructor() {
        super();
        this.httpServer = http_1.default.createServer();
        this.filter = new koa_ws_filter_1.default();
        this.wsRouter = new koa_router_1.default();
        this.httpRouter = new koa_router_1.default();
        this.koa = new koa_1.default();
        this.markets = new Map();
        this.realTime = new events_1.default();
        this.configureHttpDownload();
        this.configureUpload();
        this.configureHttpServer();
        this.configureWsDownload();
        this.filter.http(cors_1.default());
        this.filter.http(this.httpRouter.routes());
        this.filter.ws(this.wsRouter.routes());
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }
    configureUpload() {
        this.wsRouter.all('/:exchange/:pair/', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const quoteAgent = yield ctx.upgrade();
            quoteAgent.on('message', (message) => {
                const data = JSON.parse(message);
                ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
                if (!this.markets.has(ctx.state.marketName)) {
                    this.markets.set(ctx.state.marketName, new market_1.default(() => {
                        this.markets.delete(ctx.state.marketName);
                    }));
                }
                const market = this.markets.get(ctx.state.marketName);
                if (data.trades)
                    market.updateTrades(data.trades);
                if (data.orderbook)
                    market.updateOrderbook(data.orderbook);
                this.realTime.emit(ctx.state.marketName, data);
            });
        }));
    }
    configureHttpDownload() {
        this.httpRouter.get('/:exchange/:pair/trades', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
            const market = this.markets.get(ctx.state.marketName);
            if (market) {
                ctx.body = market.getTrades(ctx.query.from);
            }
            else {
                ctx.status = 404;
            }
            yield next();
        }));
        this.httpRouter.get('/:exchange/:pair/orderbook', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
            const market = this.markets.get(ctx.state.marketName);
            if (market) {
                ctx.body = market.getOrderbook(ctx.query.depth);
            }
            else {
                ctx.status = 404;
            }
            yield next();
        }));
    }
    configureWsDownload() {
        this.wsRouter.all('/:exchange/:pair/trades', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const downloader = yield ctx.upgrade();
            ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
            function onData(data) {
                if (!data.trades)
                    return;
                const message = JSON.stringify(data.trades);
                downloader.send(message, (err) => {
                    if (err)
                        console.error(err);
                });
            }
            this.realTime.on(ctx.state.marketName, onData);
            downloader.on('error', console.error);
            downloader.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        }));
        this.wsRouter.all('/:exchange/:pair/orderbook', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const downloader = yield ctx.upgrade();
            ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
            function onData(data) {
                if (!data.orderbook)
                    return;
                const message = JSON.stringify(data.orderbook);
                downloader.send(message, (err) => {
                    if (err)
                        console.error(err);
                });
            }
            this.realTime.on(ctx.state.marketName, onData);
            downloader.on('error', console.error);
            downloader.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        }));
    }
    configureHttpServer() {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }
    _start() {
        return new Promise(resolve => void this.httpServer.listen(config.PORT, resolve));
    }
    _stop() {
        this.markets.forEach(market => market.destructor());
        return new Promise((resolve, reject) => void this.httpServer.close(err => {
            if (err)
                reject(err);
            else
                resolve();
        }));
    }
}
exports.default = QuoteCenter;
//# sourceMappingURL=index.js.map