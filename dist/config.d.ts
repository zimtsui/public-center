export interface Config {
    PORT: number;
    CLEANING_INTERVAL: number;
    TTL: number;
    HTTP_KEEP_ALIVE_TIMEOUT: number;
    HTTP_TIMEOUT: number;
    WS_CLOSE_TIMEOUT: number;
}
export declare const config: Config;
export default config;
