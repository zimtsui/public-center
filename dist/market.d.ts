/**
 * 之所以用 id 来排序是因为有的交易所会出现多个订单时间相同的情况。
 */
import { Config, Trade, Orderbook } from './interfaces';
declare class Market {
    private destructing;
    private state;
    private config;
    private trades;
    private orderbook;
    private cleaner;
    constructor(destructing?: () => void, userConfig?: Config);
    destructor(): void;
    getTrades(from?: number): Trade[];
    getOrderbook(depth?: number): Orderbook;
    updateTrades(newTrades: Trade[]): void;
    updateOrderbook(newOrderbook: Orderbook): void;
}
export default Market;
