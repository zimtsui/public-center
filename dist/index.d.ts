/**
 * unreusable
 */
declare class QuoteCenter {
    private state;
    private httpServer;
    private upServer;
    private downServer;
    private markets;
    constructor();
    private started;
    start(): Promise<void>;
    private _start;
    private stopped;
    stop(): Promise<void>;
    private _stop;
    private configureHttpServer;
    private configureUpServer;
    private configureDownServer;
}
export default QuoteCenter;
