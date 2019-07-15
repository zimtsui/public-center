import _ from 'lodash';
import Pollerloop from 'pollerloop';
import { Polling } from 'pollerloop';
import Queue from 'queue';
import fse from 'fs-extra';
import { Config, Trade, Orderbook } from './interfaces';

class Market {
    private defaultConfig: Config = fse.readJsonSync('../cfg/config.json');
    private config: Config;
    private trades = new Queue<Trade>();
    private orderbook: Orderbook = { asks: [], bids: [], };
    private cleaner: Pollerloop;
    constructor(
        private destructing: (err?: Error) => void = () => { },
        userConfig?: Config
    ) {
        this.config = { ...this.defaultConfig, ...userConfig };
        const polling: Polling = async (stopping, isRunning, delay) => {
            for (; isRunning();) {
                const timer = delay(this.config.INTERVAL_OF_CLEANING);

                const nowTimeStamp = Date.now();
                this.trades.shiftWhile(
                    trade => trade.time.getTime() < nowTimeStamp - this.config.TTL
                );
                this.trades.length || this.destructor();

                await timer;
            }
            stopping();
        }
        this.cleaner = new Pollerloop(polling);
        this.cleaner.start();
    }

    destructor(): void {
        this.destructing();
        this.cleaner.stop();
    }

    getTrades(from = new Date(0)): Trade[] {
        return this.trades.takeRearWhile(trade => trade.time >= from);
    }

    getOrderbook(depth = Infinity): Orderbook {
        return {
            bids: _.take(this.orderbook.bids, depth),
            asks: _.take(this.orderbook.asks, depth),
        };
    }

    updateTrades(newTrades: Trade[]): void {
        const latest = this.trades.length ? this.trades.rearElem.time : new Date(0);
        this.trades.push(...
            _.takeWhile(newTrades, trade => trade.time > latest).reverse()
        );
    }

    updateOrderbook(newOrderbook: Orderbook): void {
        this.orderbook = newOrderbook;
    }
}

export default Market;
