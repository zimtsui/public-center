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
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const assert_1 = __importDefault(require("assert"));
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const market_1 = __importDefault(require("./market"));
const config = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../cfg/config.json'));
var States;
(function (States) {
    States[States["CONSTRUCTED"] = 0] = "CONSTRUCTED";
    States[States["STARTED"] = 1] = "STARTED";
    States[States["STOPPING"] = 2] = "STOPPING";
})(States || (States = {}));
class QuoteCenter {
    constructor() {
        this.state = States.CONSTRUCTED;
        // private stopping: (() => void) | undefined = undefined;
        this.httpServer = http_1.default.createServer();
        this.upServer = new ws_1.default.Server({ server: this.httpServer });
        this.downServer = new koa_1.default();
        this.markets = new Map();
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
        this.upServer.on('connection', (quoteAgent) => {
            global.t.log('connection');
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
                // (<any>global).t.log(data);
                // (<any>global).t.log(marketName);
            });
        });
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
    start( /* stopping = () => { } */) {
        // this.stopping = stopping;
        // console.log('listening');
        this.state = States.STARTED;
        return new bluebird_1.default(resolve => void this.httpServer.listen(config.PORT, resolve));
    }
    stop() {
        assert_1.default(this.state === States.STARTED);
        this.state = States.STOPPING;
        // console.log('stopping');
        // this.stopping!();
        this.httpServer.close();
        this.markets.forEach(market => market.destructor());
    }
}
exports.default = QuoteCenter;
//# sourceMappingURL=index.js.map