/*
    交易所给的 trade id 不一定是有序的，甚至都不一定是数字。
*/
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import _ from 'lodash';
import TtlQueue from 'ttl-queue';
var Market = /** @class */ (function () {
    function Market(config) {
        this.config = config;
        this.orderbook = {
            asks: [], bids: [],
            time: Number.NEGATIVE_INFINITY
        };
        this.trades = new TtlQueue({
            ttl: this.config.TTL,
            cleaningInterval: this.config.CLEANING_INTERVAL
        });
    }
    Market.prototype.getTrades = function (from) {
        if (from === void 0) { from = Symbol('unique'); }
        return _.takeRightWhile(__spreadArrays(this.trades), function (trade) { return trade.id !== from; });
    };
    Market.prototype.updateTrades = function (newTrades) {
        var _this = this;
        newTrades.forEach(function (trade) { return _this.trades.push(trade, trade.time); });
    };
    Market.prototype.getOrderbook = function (depth) {
        if (depth === void 0) { depth = Number.POSITIVE_INFINITY; }
        return {
            bids: _.take(this.orderbook.bids, depth),
            asks: _.take(this.orderbook.asks, depth),
            time: this.orderbook.time
        };
    };
    Market.prototype.updateOrderbook = function (newOrderbook) {
        this.orderbook = newOrderbook;
    };
    return Market;
}());
export { Market as default, Market, };
