import { Config, Trade, Orderbook } from './interfaces';
declare class Market {
    private config;
    private trades;
    private orderbook;
    constructor(config: Config);
    getTrades(from?: unknown): Trade[];
    updateTrades(newTrades: Trade[]): void;
    getOrderbook(depth?: number): Orderbook;
    updateOrderbook(newOrderbook: Orderbook): void;
}
export default Market;
