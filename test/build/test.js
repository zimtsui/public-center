"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = __importDefault(require("ava"));
const chai_1 = __importDefault(require("chai"));
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
chai_1.default.use(chai_as_promised_1.default);
const { assert } = chai_1.default;
const chance_1 = __importDefault(require("chance"));
const chance = new chance_1.default();
const axios_1 = __importDefault(require("axios"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const bluebird_1 = __importDefault(require("bluebird"));
const lodash_1 = __importDefault(require("lodash"));
const ws_1 = __importDefault(require("ws"));
const interfaces_1 = require("../../dist/interfaces");
const __1 = __importDefault(require("../.."));
const events_1 = require("events");
const config = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../../cfg/config.json'));
const tradeNum = 2;
const OrderNum = 2;
const likelihood = 90;
function randomOrder() {
    return {
        action: chance.pickone([interfaces_1.Action.BID, interfaces_1.Action.ASK]),
        price: chance.integer({
            min: 1000,
            max: 100000,
        }),
        amount: chance.floating({
            min: .01,
            max: 1.
        }),
    };
}
function randomTrade() {
    const now = Date.now();
    return Object.assign(Object.assign({}, randomOrder()), { time: now, id: now });
}
function randomOrderbook() {
    const orders = lodash_1.default.range(0, OrderNum).map(() => randomOrder());
    return {
        bids: orders.filter(order => order.action === interfaces_1.Action.BID),
        asks: orders.filter(order => order.action === interfaces_1.Action.ASK),
    };
}
function randomTrades() {
    return __awaiter(this, void 0, void 0, function* () {
        const trades = [];
        for (const i of lodash_1.default.range(0, tradeNum)) {
            trades.push(randomTrade());
            yield bluebird_1.default.delay(1);
        }
        return trades;
    });
}
function randomMessage() {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            exchange: 'bitmex',
            pair: ['btc', 'usd'],
        };
        if (chance.bool({ likelihood }))
            message.orderbook = randomOrderbook();
        if (chance.bool({ likelihood }))
            message.trades = yield randomTrades();
        return message;
    });
}
ava_1.default.serial('start and stop', (t) => __awaiter(void 0, void 0, void 0, function* () {
    const quoteCenter = new __1.default();
    t.log('starting');
    yield quoteCenter.start();
    t.log('started');
    t.log('stopping');
    yield quoteCenter.stop();
}));
ava_1.default.serial.skip('random', (t) => __awaiter(void 0, void 0, void 0, function* () {
    t.log(randomOrder());
    t.log(randomTrade());
    t.log(randomOrderbook());
    t.log(yield randomTrades());
}));
ava_1.default.serial('connection', (t) => __awaiter(void 0, void 0, void 0, function* () {
    global.t = t;
    const quoteCenter = new __1.default();
    t.log(1);
    yield quoteCenter.start();
    const uploader = new ws_1.default(`ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    t.log(2);
    yield events_1.once(uploader, 'open');
    t.log(3);
    yield bluebird_1.default.delay(500);
    uploader.close();
    t.log(4);
    yield events_1.once(uploader, 'close');
    yield quoteCenter.stop();
    t.log(5);
    yield bluebird_1.default.delay(500);
}));
ava_1.default.serial('upload', (t) => __awaiter(void 0, void 0, void 0, function* () {
    global.t = t;
    const quoteCenter = new __1.default();
    yield quoteCenter.start();
    const uploader = new ws_1.default(`ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    yield events_1.once(uploader, 'open');
    yield bluebird_1.default.delay(500);
    uploader.send(JSON.stringify(yield randomMessage()));
    yield bluebird_1.default.delay(1000);
    uploader.close();
    yield events_1.once(uploader, 'close');
    yield quoteCenter.stop();
}));
ava_1.default.serial('download', (t) => __awaiter(void 0, void 0, void 0, function* () {
    global.t = t;
    const quoteCenter = new __1.default();
    yield quoteCenter.start();
    const uploader = new ws_1.default(`ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    yield events_1.once(uploader, 'open');
    uploader.send(JSON.stringify(yield randomMessage()));
    yield bluebird_1.default.delay(1000);
    uploader.close();
    yield events_1.once(uploader, 'close');
    const orderbook = yield axios_1.default.get(`http://localhost:${config.PORT}/bitmex/btc.usdt/orderbook`);
    t.log(orderbook.data);
    const trades = yield axios_1.default.get(`http://localhost:${config.PORT}/bitmex/btc.usdt/trades`);
    t.log(trades.data);
    yield quoteCenter.stop();
}));
ava_1.default.serial('cleaner', (t) => __awaiter(void 0, void 0, void 0, function* () {
    global.t = t;
    const quoteCenter = new __1.default();
    yield quoteCenter.start();
    const uploader = new ws_1.default(`ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    yield events_1.once(uploader, 'open');
    uploader.send(JSON.stringify(yield randomMessage()));
    yield bluebird_1.default.delay(5000);
    uploader.send(JSON.stringify(yield randomMessage()));
    uploader.close();
    yield events_1.once(uploader, 'close');
    yield axios_1.default.get(`http://localhost:${config.PORT}/bitmex/btc.usdt/trades`)
        .then(res => res.data)
        .then(data => t.log(data));
    yield bluebird_1.default.delay(6000);
    yield axios_1.default.get(`http://localhost:${config.PORT}/bitmex/btc.usdt/trades`)
        .then(res => res.data)
        .then(data => t.log(data));
    yield quoteCenter.stop();
}));
//# sourceMappingURL=test.js.map