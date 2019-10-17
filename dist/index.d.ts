import Autonomous from 'autonomous';
declare class PublicCenter extends Autonomous {
    private httpServer;
    private filter;
    private wsRouter;
    private httpRouter;
    private koa;
    private markets;
    private onlineMarkets;
    private realTime;
    constructor();
    private addMarketName;
    private configureUpload;
    private configureHttpDownload;
    private configureWsDownload;
    private configureHttpServer;
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
}
export default PublicCenter;
export { PublicCenter };
