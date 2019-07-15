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
const lodash_1 = __importDefault(require("lodash"));
const pollerloop_1 = __importDefault(require("pollerloop"));
const queue_1 = __importDefault(require("queue"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class Market {
    constructor(destructing = () => { }, userConfig) {
        this.destructing = destructing;
        this.defaultConfig = fs_extra_1.default.readJsonSync('../cfg/config.json');
        this.trades = new queue_1.default();
        this.orderbook = { asks: [], bids: [], };
        this.config = Object.assign({}, this.defaultConfig, userConfig);
        const polling = (stopping, isRunning, delay) => __awaiter(this, void 0, void 0, function* () {
            for (; isRunning();) {
                const timer = delay(this.config.INTERVAL_OF_CLEANING);
                const nowTimeStamp = Date.now();
                this.trades.shiftWhile(trade => trade.time.getTime() < nowTimeStamp - this.config.TTL);
                this.trades.length || this.destructor();
                yield timer;
            }
            stopping();
        });
        this.cleaner = new pollerloop_1.default(polling);
        /**
         * 不需要 cb，因为 cleaner 根本不会自析构。
         */
        this.cleaner.start();
    }
    destructor() {
        this.destructing();
        this.cleaner.stop();
    }
    getTrades(from = new Date(0)) {
        return this.trades.takeRearWhile(trade => trade.time >= from);
    }
    getOrderbook(depth = Infinity) {
        return {
            bids: lodash_1.default.take(this.orderbook.bids, depth),
            asks: lodash_1.default.take(this.orderbook.asks, depth),
        };
    }
    updateTrades(newTrades) {
        const latest = this.trades.length ? this.trades.rearElem.time : new Date(0);
        this.trades.push(...lodash_1.default.takeWhile(newTrades, trade => trade.time > latest).reverse());
    }
    updateOrderbook(newOrderbook) {
        this.orderbook = newOrderbook;
    }
}
exports.default = Market;
//# sourceMappingURL=market.js.map