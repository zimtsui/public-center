import Autonomous from 'autonomous';
declare class QuoteCenter extends Autonomous {
    private httpServer;
    private upServer;
    private downServer;
    private markets;
    private configureHttpServer;
    private configureUpServer;
    private configureDownServer;
    constructor();
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
}
export default QuoteCenter;
