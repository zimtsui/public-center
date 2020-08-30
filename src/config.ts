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
    TTL: 120000,
    CLEANING_INTERVAL: 10000,
    /*
        现在的浏览器都是同时开很多条连接，一条发请求，其他的连好 TCP 后就故意卡在那儿。
        所以这个 keep alive 超时设置没什么卵用，不如关掉超时。
    */
    HTTP_KEEP_ALIVE_TIMEOUT: 0,
    HTTP_TIMEOUT: 3000,
    WS_CLOSE_TIMEOUT: 1000,
}

export default config;