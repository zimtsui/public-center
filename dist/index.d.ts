declare class QuoteCenter {
    private state;
    private httpServer;
    private upServer;
    private downServer;
    private markets;
    constructor();
    start(): Promise<void>;
    stop(): void;
}
export default QuoteCenter;
