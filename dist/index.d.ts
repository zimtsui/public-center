declare class QuoteCenter {
    private state;
    private httpServer;
    private upServer;
    private downServer;
    private markets;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private configureHttpServer;
    private configureUpServer;
    private configureDownServer;
}
export default QuoteCenter;
