/*
    交易所给的 trade id 不一定是有序的，甚至都不一定是数字。
*/
import _ from 'lodash';
import TtlQueue from 'ttl-queue';
import config from './config';
class Market {
    constructor() {
        this.orderbook = {
            asks: [], bids: [],
            time: Number.NEGATIVE_INFINITY,
        };
        this.trades = new TtlQueue({
            ttl: config.TTL,
            cleaningInterval: config.CLEANING_INTERVAL,
        });
    }
    getTrades(from = Symbol('unique')) {
        return _.takeRightWhile([...this.trades], trade => trade.id !== from);
    }
    updateTrades(newTrades) {
        newTrades.forEach(trade => this.trades.push(trade, trade.time));
    }
    getOrderbook(depth = Number.POSITIVE_INFINITY) {
        return {
            bids: _.take(this.orderbook.bids, depth),
            asks: _.take(this.orderbook.asks, depth),
            time: this.orderbook.time,
        };
    }
    updateOrderbook(newOrderbook) {
        this.orderbook = newOrderbook;
    }
}
export { Market as default, Market, };
//# sourceMappingURL=market.js.map