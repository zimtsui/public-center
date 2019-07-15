import { Config, Trade, Orderbook } from './interfaces';
declare class Market {
    private destructing;
    private defaultConfig;
    private config;
    private trades;
    private orderbook;
    private cleaner;
    constructor(destructing?: (err?: Error) => void, userConfig?: Config);
    destructor(): Promise<boolean>;
    getTrades(from?: Date): Trade[];
    getOrderbook(depth?: number): Orderbook;
    updateTrades(newTrades: Trade[]): void;
    updateOrderbook(newOrderbook: Orderbook): void;
}
export default Market;
