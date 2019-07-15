enum Action {
    BID = 'bid',
    ASK = 'ask',
}

interface Order {
    action: Action;
    price: number;
    amount: number;
}

interface Trade extends Order {
    time: Date;
}

interface Orderbook {
    bids: Order[],
    asks: Order[],
}

interface Config {
    PORT: number;
    INTERVAL_OF_CLEANING: number;
    TTL: number;
}

interface MsgFromAgent {
    exchange: string,
    pair: [string, string],
    trades?: Trade[],
    orderbook?: Orderbook,
}

export {
    Config,
    Action,
    Trade,
    Order,
    Orderbook,
    MsgFromAgent,
};