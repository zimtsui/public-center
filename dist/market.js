"use strict";
/*
    交易所给的 trade id 不一定是有序的，甚至都不一定是数字。
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const ttl_queue_1 = __importDefault(require("ttl-queue"));
class Market {
    constructor(config) {
        this.config = config;
        this.trades = new ttl_queue_1.default(this.config.TTL);
        this.orderbook = { asks: [], bids: [] };
    }
    getTrades(from = Symbol('unique')) {
        return lodash_1.takeRightWhile(this.trades, trade => trade.id !== from);
    }
    updateTrades(newTrades) {
        this.trades.pushWithTime(...newTrades.map(trade => ({
            element: trade,
            time: trade.time,
        })));
    }
    getOrderbook(depth = Number.POSITIVE_INFINITY) {
        return {
            bids: lodash_1.take(this.orderbook.bids, depth),
            asks: lodash_1.take(this.orderbook.asks, depth),
        };
    }
    updateOrderbook(newOrderbook) {
        this.orderbook = newOrderbook;
    }
}
exports.default = Market;
//# sourceMappingURL=market.js.map