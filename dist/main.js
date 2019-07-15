"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = __importDefault(require("."));
process.on('unhandledRejection', (err) => {
    console.log('unhandledRejection', err);
    process.exit(-1);
});
process.on('uncaughtException', (err) => {
    console.log('uncaughtException', err);
    process.exit(-1);
});
const quoteCenter = new _1.default();
quoteCenter.start(err => {
    console.log(err);
}).catch(err => {
    console.log(err);
    process.exit(-1);
}).then(() => {
    process.once('SIGINT', () => {
        process.once('SIGINT', () => process.exit(-1));
        quoteCenter.stop();
    });
});
//# sourceMappingURL=main.js.map