import { Action, Trade, Order, Orderbook, QuoteDataFromAgentToCenter } from 'interfaces';
interface Config {
    PORT: number;
    INTERVAL_OF_CLEANING: number;
    TTL: number;
}
export { Config, Action, Trade, Order, Orderbook, QuoteDataFromAgentToCenter, };
