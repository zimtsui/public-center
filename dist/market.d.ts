import { Trade, Orderbook } from './interfaces';
import Startable from 'startable';
declare class Market extends Startable {
    private trades;
    private orderbook;
    constructor();
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
    getTrades(from?: unknown): Trade[];
    updateTrades(newTrades: Trade[]): void;
    getOrderbook(depth?: number): Orderbook;
    updateOrderbook(newOrderbook: Orderbook): void;
}
export { Market as default, Market, };
