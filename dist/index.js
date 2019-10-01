"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const autonomous_1 = __importDefault(require("autonomous"));
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const market_1 = __importDefault(require("./market"));
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const config = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../cfg/config.json'));
class QuoteCenter extends autonomous_1.default {
    constructor() {
        super();
        this.httpServer = http_1.default.createServer();
        this.upServer = new ws_1.default.Server({ server: this.httpServer });
        this.downServer = new koa_1.default();
        this.markets = new Map();
        this.configureHttpServer();
        this.configureDownServer();
        this.configureUpServer();
    }
    configureHttpServer() {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }
    configureUpServer() {
        this.upServer.on('connection', (quoteAgent) => {
            quoteAgent.on('message', (message) => {
                const data = JSON.parse(message);
                const marketName = lodash_1.default.toLower(`${data.exchange}.${data.pair[0]}.${data.pair[1]}`);
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
        });
    }
    configureDownServer() {
        this.downServer.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.marketName = lodash_1.default.toLower(`${ctx.query.exchange}.${ctx.query.pair}`);
            yield next();
        }));
        const router = new koa_router_1.default();
        router.get('/trades', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const market = this.markets.get(ctx.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getTrades(ctx.query.from);
            }
            else {
                ctx.status = 404;
            }
            yield next();
        }));
        router.get('/orderbook', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const market = this.markets.get(ctx.marketName);
            if (market) {
                ctx.status = 200;
                ctx.body = market.getOrderbook(ctx.query.depth);
            }
            else {
                ctx.status = 404;
            }
            yield next();
        }));
        this.downServer.use(router.routes());
        this.httpServer.on('request', this.downServer.callback());
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