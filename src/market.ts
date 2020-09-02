/*
    交易所给的 trade id 不一定是有序的，甚至都不一定是数字。
*/

import _ from 'lodash';
import TtlQueue from 'ttl-queue';
import { Trade, Orderbook } from './interfaces';
import config from './config';
import Startable from 'startable';

class Market extends Startable {
    private trades: TtlQueue<Trade>;
    private orderbook: Orderbook = {
        asks: [], bids: [],
        time: Number.NEGATIVE_INFINITY,
    };

    constructor() {
        super();
        this.trades = new TtlQueue<Trade>({
            ttl: config.TTL,
            cleaningInterval: config.CLEANING_INTERVAL,
        });
    }

    protected async _start() {
        await this.trades.start(err => this.stop(err));
    }

    protected async _stop() {
        await this.trades.stop();
    }

    public getTrades(from: unknown = Symbol('unique')): Trade[] {
        return _.takeRightWhile([...this.trades], trade => trade.id !== from);
    }

    public updateTrades(newTrades: Trade[]): void {
        newTrades.forEach(trade => this.trades.push(trade, trade.time));
    }

    public getOrderbook(depth = Number.POSITIVE_INFINITY): Orderbook {
        return {
            bids: _.take(this.orderbook.bids, depth),
            asks: _.take(this.orderbook.asks, depth),
            time: this.orderbook.time,
        };
    }

    public updateOrderbook(newOrderbook: Orderbook): void {
        this.orderbook = newOrderbook;
    }
}

export {
    Market as default,
    Market,
}
