declare class QuoteCenter {
    private destructing;
    private config;
    private httpServer;
    private wsServer;
    private koa;
    private router;
    private markets;
    constructor(destructing?: (err?: Error) => void);
    start(): Promise<void>;
    stop(): Promise<void>;
    destructor(err?: Error): Promise<void>;
}
export default QuoteCenter;
