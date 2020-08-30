import { Trade, Orderbook } from './interfaces';
declare class Market {
    private trades;
    private orderbook;
    constructor();
    getTrades(from?: unknown): Trade[];
    updateTrades(newTrades: Trade[]): void;
    getOrderbook(depth?: number): Orderbook;
    updateOrderbook(newOrderbook: Orderbook): void;
}
export { Market as default, Market, };
