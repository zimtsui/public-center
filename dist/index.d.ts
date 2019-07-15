declare class QuoteCenter {
    private stopping;
    private config;
    private httpServer;
    private wsServer;
    private koa;
    private router;
    private markets;
    constructor();
    start(stopping?: (err?: Error) => void): Promise<void>;
    stop(err?: Error): Promise<void>;
}
export default QuoteCenter;
