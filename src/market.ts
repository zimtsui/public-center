import _ from 'lodash';
import Pollerloop from 'pollerloop';
import { Polling } from 'pollerloop';
import Queue from 'queue';
import fse from 'fs-extra';
import path from 'path';
import { Config, Trade, Orderbook } from './interfaces';

const defaultConfig: Config = fse.readJsonSync(path.join(__dirname,
    '../cfg/config.json'));

class Market {
    private config: Config;
    private trades = new Queue<Trade>();
    private orderbook: Orderbook = { asks: [], bids: [], };
    private cleaner: Pollerloop;
    constructor(
        private destructing: () => void = () => { },
        userConfig?: Config
    ) {
        this.config = { ...defaultConfig, ...userConfig };
        const polling: Polling = async (stopping, isRunning, delay) => {
            for (; isRunning();) {
                /**
                 * await delay 必须放循环前面，不然 market 构造析构就在同一个
                 * eventloop 了。
                 */
                await delay(this.config.INTERVAL_OF_CLEANING);
                if (!isRunning()) break;

                const now = Date.now();
                this.trades.shiftWhile(
                    trade => trade.time < now - this.config.TTL
                );
                this.trades.length || this.destructor();
            }
            stopping();
        }
        this.cleaner = new Pollerloop(polling);
        /**
         * 不需要 cb，因为 cleaner 根本不会自析构。
         */
        this.cleaner.start();
    }

    destructor(): void {
        this.destructing();
        this.cleaner.stop();
    }

    getTrades(from = -Infinity): Trade[] {
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
