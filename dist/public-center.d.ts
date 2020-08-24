import Startable from 'startable';
declare class PublicCenter extends Startable {
    private httpServer;
    private filter;
    private wsRouter;
    private httpRouter;
    private koa;
    private markets;
    private onlineMarkets;
    private broadcast;
    constructor();
    private addMarketName;
    private configureUpload;
    private configureHttpDownload;
    private configureWsDownload;
    private configureHttpServer;
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
}
export { PublicCenter as default, PublicCenter, };
