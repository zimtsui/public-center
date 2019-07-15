import _ from 'lodash';
import Pollerloop from 'pollerloop';
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
        this.cleaner = new Pollerloop(async (stopping, isRunning, delay) => {
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
            return isRunning();
        });
        this.cleaner.start(this.destructing);
    }

    destructor(): Promise<boolean> {
        this.destructing();
        return this.cleaner.stop();
    }

    getTrades(from = new Date(0)): Trade[] {
        return this.trades.takeRearWhile(trade => trade.time >= from);
    }

    getOrderbook(depth?: number): Orderbook {
        return {
            bids: _.take(this.orderbook.bids, depth || Infinity),
            asks: _.take(this.orderbook.asks, depth || Infinity),
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
