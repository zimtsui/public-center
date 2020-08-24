/*
    交易所给的 trade id 不一定是有序的，甚至都不一定是数字。
*/

import _ from 'lodash';
import TtlQueue from 'ttl-queue';
import { Config, Trade, Orderbook } from './interfaces';

class Market {
    private trades: TtlQueue<Trade>;
    private orderbook: Orderbook = {
        asks: [], bids: [],
        time: Number.NEGATIVE_INFINITY,
    };

    constructor(private config: Config) {
        this.trades = new TtlQueue<Trade>({
            ttl: this.config.TTL,
            cleaningInterval: this.config.CLEANING_INTERVAL,
        });
    }

    getTrades(from: unknown = Symbol('unique')): Trade[] {
        return _.takeRightWhile([...this.trades], trade => trade.id !== from);
    }

    updateTrades(newTrades: Trade[]): void {
        newTrades.forEach(trade => this.trades.push(trade, trade.time));
    }

    getOrderbook(depth = Number.POSITIVE_INFINITY): Orderbook {
        return {
            bids: _.take(this.orderbook.bids, depth),
            asks: _.take(this.orderbook.asks, depth),
            time: this.orderbook.time,
        };
    }

    updateOrderbook(newOrderbook: Orderbook): void {
        this.orderbook = newOrderbook;
    }
}

export {
    Market as default,
    Market,
}
