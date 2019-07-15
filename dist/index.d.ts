declare class QuoteCenter {
    private state;
    private config;
    private httpServer;
    private upServer;
    private downServer;
    private markets;
    constructor();
    start(): Promise<void>;
    stop(): void;
}
export default QuoteCenter;
