export * from 'interfaces';

export interface Config {
    PORT: number;
    CLEANING_INTERVAL: number;
    TTL: number;
    HTTP_KEEP_ALIVE: number;
}