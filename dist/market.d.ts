import { Config, Trade, Orderbook } from './interfaces';
declare class Market {
    private destructing;
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
