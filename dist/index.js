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
const bluebird_1 = __importDefault(require("bluebird"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const lodash_1 = __importDefault(require("lodash"));
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const market_1 = __importDefault(require("./market"));
class QuoteCenter {
    constructor(destructing = () => { }) {
        this.destructing = destructing;
        this.config = fs_extra_1.default.readJsonSync('../cfg/config.json');
        this.httpServer = http_1.default.createServer();
        this.wsServer = new ws_1.default.Server({ server: this.httpServer });
        this.koa = new koa_1.default();
        this.router = new koa_router_1.default();
        this.markets = new Map();
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
        this.wsServer.on('connection', (quoteAgent) => {
            quoteAgent.on('message', (message) => {
                const data = JSON.parse(message);
                const marketName = lodash_1.default.toLower(`${data.exchange}.${data.pair[0]}.${data.pair[1]}`);
                if (!this.markets.has(marketName)) {
                    this.markets.set(marketName, new market_1.default(err => {
                        this.markets.delete(marketName);
                        if (err)
                            this.destructor(err);
                    }));
                }
                const market = this.markets.get(marketName);
                if (data.trades)
                    market.updateTrades(data.trades);
                if (data.orderbook)
                    market.updateOrderbook(data.orderbook);
            });
        });
        this.koa.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.marketName = lodash_1.default.toLower(`${ctx.query.exchange}.${ctx.query.pair}`);
            yield next();
        }));
        this.router.get('/trades', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
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
        this.router.get('/orderbook', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
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
        this.koa.use(this.router.routes());
        this.httpServer.on('request', this.koa.callback());
    }
    start() {
        this.httpServer.listen(this.config.PORT);
        console.log('listening');
        return Promise.resolve();
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('stopping');
            yield bluebird_1.default.promisify(this.httpServer.close.bind(this.httpServer))();
            yield bluebird_1.default.all([...this.markets.values()].map(market => market.destructor()));
        });
    }
    destructor(err) {
        this.destructing(err);
        return this.stop();
    }
}
exports.default = QuoteCenter;
//# sourceMappingURL=index.js.map