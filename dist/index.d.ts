import Autonomous from 'autonomous';
declare class QuoteCenter extends Autonomous {
    private httpServer;
    private filter;
    private koa;
    private markets;
    constructor();
    private configureUpload;
    private configureHttpDownload;
    private configureHttpServer;
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
}
export default QuoteCenter;
