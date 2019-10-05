import test from 'ava';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { assert } = chai;
import Chance from 'chance';
const chance = new Chance();
import axios from 'axios';
import fse from 'fs-extra';
import path from 'path';
import Bluebird from 'bluebird';
import _ from 'lodash';
import WebSocket from 'ws';
import {
    Config, Orderbook, Trade, Order, Action,
    QuoteDataFromAgentToCenter
} from '../../dist/interfaces';
import QuoteCenter from '../..';

import { once } from 'events';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../../cfg/config.json'));

const tradeNum = 2;
const OrderNum = 2;
const likelihood = 90;

function randomOrder(): Order {
    return {
        action: chance.pickone([Action.BID, Action.ASK]),
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

function randomTrade(): Trade {
    const now = Date.now();
    return {
        ...randomOrder(),
        time: now,
        id: now,
    }
}

function randomOrderbook(): Orderbook {
    const orders = _.range(0, OrderNum).map(() => randomOrder());
    return {
        bids: orders.filter(order => order.action === Action.BID),
        asks: orders.filter(order => order.action === Action.ASK),
    }
}

async function randomTrades(): Promise<Trade[]> {
    const trades: Trade[] = [];
    for (const i of _.range(0, tradeNum)) {
        trades.push(randomTrade());
        await Bluebird.delay(1);
    }
    return trades;
}

async function randomMessage(): Promise<QuoteDataFromAgentToCenter> {
    const message: QuoteDataFromAgentToCenter = {
        exchange: 'bitmex',
        pair: ['btc', 'usd'],
    };
    if (chance.bool({ likelihood })) message.orderbook = randomOrderbook();
    if (chance.bool({ likelihood })) message.trades = await randomTrades();
    return message;
}

test.serial('start and stop', async t => {
    const quoteCenter = new QuoteCenter();
    t.log('starting');
    await quoteCenter.start();
    t.log('started');
    t.log('stopping');
    await quoteCenter.stop();
});

test.serial.skip('random', async t => {
    t.log(randomOrder());
    t.log(randomTrade());
    t.log(randomOrderbook());
    t.log(await randomTrades());
});

test.serial('connection', async t => {
    (<any>global).t = t;
    const quoteCenter = new QuoteCenter();
    t.log(1);
    await quoteCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    t.log(2);
    await once(uploader, 'open');
    t.log(3);
    await Bluebird.delay(500);
    uploader.close();
    t.log(4);
    await once(uploader, 'close');
    await quoteCenter.stop();
    t.log(5);
    await Bluebird.delay(500);
});

test.serial('upload', async t => {
    (<any>global).t = t;
    const quoteCenter = new QuoteCenter();
    await quoteCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    await once(uploader, 'open');
    await Bluebird.delay(500);

    uploader.send(JSON.stringify(await randomMessage()));
    await Bluebird.delay(1000);
    uploader.close();
    await once(uploader, 'close');
    await quoteCenter.stop();
});

test.serial('download', async t => {
    (<any>global).t = t;
    const quoteCenter = new QuoteCenter();
    await quoteCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    await once(uploader, 'open');

    uploader.send(JSON.stringify(await randomMessage()));
    await Bluebird.delay(1000);
    uploader.close();
    await once(uploader, 'close');

    const orderbook = await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc.usdt/orderbook`);
    t.log(orderbook.data);
    const trades = await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc.usdt/trades`);
    t.log(trades.data);

    await quoteCenter.stop();
});

test.serial('cleaner', async t => {
    (<any>global).t = t;
    const quoteCenter = new QuoteCenter();
    await quoteCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc.usdt`);
    await once(uploader, 'open');

    uploader.send(JSON.stringify(await randomMessage()));
    await Bluebird.delay(5000);
    uploader.send(JSON.stringify(await randomMessage()));
    uploader.close();
    await once(uploader, 'close');

    await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc.usdt/trades`)
        .then(res => res.data)
        .then(data => t.log(data));

    await Bluebird.delay(6000);

    await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc.usdt/trades`)
        .then(res => res.data)
        .then(data => t.log(data));

    await quoteCenter.stop();
});