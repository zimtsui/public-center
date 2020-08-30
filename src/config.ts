export interface Config {
    PORT: number;
    CLEANING_INTERVAL: number;
    TTL: number;
    HTTP_KEEP_ALIVE_TIMEOUT: number;
    HTTP_TIMEOUT: number;
    WS_CLOSE_TIMEOUT: number;
}

export const config: Config = {
    PORT: 12001,
    CLEANING_INTERVAL: 10000,
    TTL: 120000,
    HTTP_KEEP_ALIVE_TIMEOUT: 0,
    HTTP_TIMEOUT: 0,
    WS_CLOSE_TIMEOUT: 1000,
}

export default config;