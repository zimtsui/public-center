/*
    交易所给的 trade id 不一定是有序的，甚至都不一定是数字。
*/

import {
    takeRightWhile,
    take,
} from 'lodash';
import TtlQueue from 'ttl-queue';
import { Config, Trade, Orderbook } from './interfaces';

class Market {
    private trades = new TtlQueue<Trade>(this.config.TTL);
    private orderbook: Orderbook = {
        asks: [], bids: [],
        time: Number.NEGATIVE_INFINITY,
    };

    constructor(private config: Config) { }

    getTrades(from: unknown = Symbol('unique')): Trade[] {
        return takeRightWhile([...this.trades], trade => trade.id !== from);
    }

    updateTrades(newTrades: Trade[]): void {
        this.trades.pushWithTime(
            ...newTrades.map(trade => ({
                element: trade,
                time: trade.time,
            }))
        );
    }

    getOrderbook(depth = Number.POSITIVE_INFINITY): Orderbook {
        return {
            bids: take(this.orderbook.bids, depth),
            asks: take(this.orderbook.asks, depth),
            time: this.orderbook.time,
        };
    }

    updateOrderbook(newOrderbook: Orderbook): void {
        this.orderbook = newOrderbook;
    }
}

export default Market;
