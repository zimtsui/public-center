import { Action, Trade, Order, Orderbook } from 'interfaces';
interface Config {
    PORT: number;
    INTERVAL_OF_CLEANING: number;
    TTL: number;
}
interface MsgFromAgent {
    exchange: string;
    pair: [string, string];
    trades?: Trade[];
    orderbook?: Orderbook;
}
export { Config, Action, Trade, Order, Orderbook, MsgFromAgent, };
