"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const __1 = __importDefault(require("../.."));
const config = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../../cfg/config.json'));
ava_1.default.serial('start and stop', (t) => __awaiter(this, void 0, void 0, function* () {
    const quoteCenter = new __1.default();
    t.log('starting');
    yield quoteCenter.start();
    t.log('started');
    t.log('stopping');
    quoteCenter.stop();
}));
//# sourceMappingURL=test.js.map