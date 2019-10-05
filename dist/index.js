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
// import WebSocket from 'ws';
const http_1 = __importDefault(require("http"));
const market_1 = __importDefault(require("./market"));
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const koa_ws_filter_1 = __importDefault(require("koa-ws-filter"));
const config = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../cfg/config.json'));
class QuoteCenter extends autonomous_1.default {
    constructor() {
        super();
        this.httpServer = http_1.default.createServer();
        this.filter = new koa_ws_filter_1.default();
        this.koa = new koa_1.default();
        this.markets = new Map();
        this.configureHttpDownload();
        this.configureUpload();
        this.configureHttpServer();
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }
    //@ts-ignore
    configureUpload() {
        const router = new koa_router_1.default();
        router.all('/:exchange/:pair/', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const quoteAgent = yield ctx.upgrade();
            quoteAgent.on('message', (message) => {
                const data = JSON.parse(message);
                const marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
                if (!this.markets.has(marketName)) {
                    this.markets.set(marketName, new market_1.default(() => {
                        this.markets.delete(marketName);
                    }));
                }
                const market = this.markets.get(marketName);
                if (data.trades)
                    market.updateTrades(data.trades);
                if (data.orderbook)
                    market.updateOrderbook(data.orderbook);
            });
        }));
        this.filter.ws(router.routes());
    }
    //@ts-ignore
    configureHttpDownload() {
        const router = new koa_router_1.default();
        // router.all('', async (ctx, next) => {
        //     ctx.state.marketName = 
        //     await next();
        // });
        router.get('/:exchange/:pair/trades', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
            const market = this.markets.get(ctx.state.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getTrades(ctx.query.from);
            }
            else {
                ctx.status = 404;
                ctx.body = null;
            }
            yield next();
        }));
        router.get('/:exchange/:pair/orderbook', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.state.marketName = lodash_1.default.toLower(`${ctx.params.exchange}/${ctx.params.pair}`);
            const market = this.markets.get(ctx.state.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getOrderbook(ctx.query.depth);
            }
            else {
                ctx.status = 404;
                ctx.body = null;
            }
            yield next();
        }));
        this.filter.http(router.routes());
    }
    //@ts-ignore
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