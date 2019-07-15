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
import BPromise from 'bluebird';
import _ from 'lodash';
import WebSocket from 'ws';
import { Config, MsgFromAgent, Orderbook, Trade, Order, Action } from '../../dist/interfaces';
import QuoteCenter from '../..';

import EventEmitter from 'events';

const config: Config = fse.readJsonSync(path.join(__dirname,
    '../../cfg/config.json'));

const tradeNum = 0;
const OrderNum = 1;

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
    return {
        ...randomOrder(),
        time: Date.now(),
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
        await BPromise.delay(1);
    }
    return trades.reverse();
}

async function randomMessage(): Promise<MsgFromAgent> {
    const message: MsgFromAgent = {
        exchange: 'bitmex',
        pair: ['btc', 'usd'],
    };
    if (chance.bool()) message.orderbook = randomOrderbook();
    if (chance.bool()) message.trades = await randomTrades();
    return message;
}

test.serial('start and stop', async t => {
    const quoteCenter = new QuoteCenter();
    t.log('starting');
    await quoteCenter.start();
    t.log('started');
    t.log('stopping');
    quoteCenter.stop();
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
    const uploader = new WebSocket(`ws://localhost:${config.PORT}`);
    uploader.on('error', err => {
        t.log(err);
        t.fail();
    });
    t.log(2);
    await new Promise(resolve => void uploader.on('open', resolve));
    t.log(3);
    await BPromise.delay(500);
    uploader.close();
    t.log(4);
    await new Promise(resolve => void uploader.on('close', resolve));
    quoteCenter.stop();
    t.log(5);
    await BPromise.delay(500);
});

test.serial.only('upload', async t => {
    (<any>global).t = t;
    const quoteCenter = new QuoteCenter();
    t.log(1);
    await quoteCenter.start();
    const uploader = new WebSocket(`ws://localhost:${config.PORT}`);
    uploader.on('error', err => {
        t.log(err);
        t.fail();
    });
    await new Promise(resolve => void uploader.on('open', resolve));
    await BPromise.delay(500);

    uploader.send(JSON.stringify(await randomMessage()));
    await BPromise.delay(1000);
    uploader.close();
    await new Promise(resolve => void uploader.on('close', resolve));
    quoteCenter.stop();
});