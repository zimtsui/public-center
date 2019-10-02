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
const lodash_1 = __importDefault(require("lodash"));
const pollerloop_1 = __importDefault(require("pollerloop"));
const queue_1 = __importDefault(require("queue"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const assert_1 = __importDefault(require("assert"));
const defaultConfig = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../cfg/config.json'));
var States;
(function (States) {
    States[States["RUNNING"] = 0] = "RUNNING";
    States[States["DESTRUCTED"] = 1] = "DESTRUCTED";
})(States || (States = {}));
class Market {
    constructor(destructing = () => { }, userConfig) {
        this.destructing = destructing;
        this.state = States.RUNNING;
        this.trades = new queue_1.default();
        this.orderbook = { asks: [], bids: [], };
        this.config = Object.assign(Object.assign({}, defaultConfig), userConfig);
        const polling = (stopping, isRunning, delay) => __awaiter(this, void 0, void 0, function* () {
            for (;;) {
                /**
                 * await delay 必须放循环前面，不然 market 构造析构就在同一个
                 * eventloop 了。
                 */
                yield delay(this.config.INTERVAL_OF_CLEANING);
                if (!isRunning())
                    break;
                const now = Date.now();
                this.trades.shiftWhile(trade => trade.time < now - this.config.TTL);
                this.trades.length || this.destructor();
            }
            stopping();
        });
        this.cleaner = new pollerloop_1.default(polling);
        /**
         * 不需要 cb，因为 cleaner 根本不会自析构。
         */
        this.cleaner.start();
    }
    destructor() {
        assert_1.default(this.state === States.RUNNING);
        this.state = States.DESTRUCTED;
        this.destructing();
        this.cleaner.stop();
    }
    getTrades(from = -Infinity) {
        assert_1.default(this.state === States.RUNNING);
        return this.trades.takeRearWhile(trade => trade.time > from);
    }
    getOrderbook(depth = Infinity) {
        assert_1.default(this.state === States.RUNNING);
        return {
            bids: lodash_1.default.take(this.orderbook.bids, depth),
            asks: lodash_1.default.take(this.orderbook.asks, depth),
        };
    }
    updateTrades(newTrades) {
        assert_1.default(this.state === States.RUNNING);
        const latest = this.trades.length ? this.trades.rearElem.time : new Date(0);
        this.trades.push(...lodash_1.default.takeRightWhile(newTrades, trade => trade.time > latest));
    }
    updateOrderbook(newOrderbook) {
        assert_1.default(this.state === States.RUNNING);
        this.orderbook = newOrderbook;
    }
}
exports.default = Market;
//# sourceMappingURL=market.js.map