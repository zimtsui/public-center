import test from 'ava';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { assert } = chai;
import Chance from 'chance';
const chance = new Chance();
import axios from 'axios';
import { promisify } from 'util';
import _ from 'lodash';
import WebSocket from 'ws';
import {
    Orderbook, Trade, Order, Action,
    DataFromPublicAgentToCenter,
} from '../../dist/interfaces';
import PublicCenter from '../../dist/public-center';
import { once } from 'events';
import config from '../../dist/config';
const sleep = promisify(setTimeout);

const tradeNum = 3;
const OrderNum = 8;
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
    const orders = _
        .range(0, OrderNum)
        .map(() => randomOrder())
        .sort((o1, o2) => o1.price - o2.price);
    return {
        bids: orders
            .slice(0, orders.length / 2)
            .reverse()
            .map(order => {
                order.action = Action.BID;
                return order;
            }),
        asks: orders
            .slice(orders.length / 2)
            .map(order => {
                order.action = Action.ASK;
                return order;
            }),
        time: Date.now(),
    }
}

async function randomTrades(): Promise<Trade[]> {
    const trades: Trade[] = [];
    for (const i of _.range(0, tradeNum)) {
        trades.push(randomTrade());
        await sleep(1);
    }
    return trades;
}

async function randomMessage(): Promise<DataFromPublicAgentToCenter> {
    const message: DataFromPublicAgentToCenter = {};
    if (chance.bool({ likelihood })) message.trades = await randomTrades();
    if (chance.bool({ likelihood })) message.orderbook = randomOrderbook();
    return message;
}

test.serial('start and stop', async t => {
    const publicCenter = new PublicCenter();
    t.log('starting');
    await publicCenter.start();
    t.log('started');
    t.log('stopping');
    await publicCenter.stop();
});

test.serial('random', async t => {
    t.log(randomOrder());
    t.log(randomTrade());
    t.log(randomOrderbook());
    t.log(await randomTrades());
});

test.serial('connection', async t => {
    console.log = t.log;

    const publicCenter = new PublicCenter();
    t.log(1);
    await publicCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc/usdt`);
    t.log(2);
    await once(uploader, 'open');
    t.log(3);
    await sleep(500);
    uploader.close();
    t.log(4);
    await once(uploader, 'close');
    await publicCenter.stop();
    t.log(5);
    await sleep(500);
});

test.serial('upload', async t => {
    console.log = t.log;

    const publicCenter = new PublicCenter();
    await publicCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc/usdt`);
    await once(uploader, 'open');
    await sleep(500);

    uploader.send(JSON.stringify(await randomMessage()));
    await sleep(1000);
    uploader.close();
    await once(uploader, 'close');
    await publicCenter.stop();
});

test.serial('upload and download', async t => {
    console.log = t.log;
    assert(config.TTL > 2000);

    const publicCenter = new PublicCenter();
    await publicCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc/usdt`);
    await once(uploader, 'open');

    uploader.send(JSON.stringify(await randomMessage()));
    await sleep(1000);

    const orderbook = await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc/usdt/orderbook`);
    t.log(orderbook.data);
    const trades = await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc/usdt/trades`);
    t.log(trades.data);

    uploader.close();
    await once(uploader, 'close');
    await publicCenter.stop();
});

test.serial('ttl queue', async t => {
    console.log = t.log;
    assert(config.TTL === 5000);
    assert(config.CLEANING_INTERVAL === 0);

    const publicCenter = new PublicCenter();
    await publicCenter.start();
    const uploader = new WebSocket(
        `ws://localhost:${config.PORT}/bitmex/btc/usdt`);
    await once(uploader, 'open');

    uploader.send(JSON.stringify(await randomMessage()));
    await sleep(4000);
    uploader.send(JSON.stringify(await randomMessage()));

    await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc/usdt/trades`)
        .then(res => res.data)
        .then(data => t.log(data));

    await sleep(2000);

    await axios.get(
        `http://localhost:${config.PORT}/bitmex/btc/usdt/trades`)
        .then(res => res.data)
        .then(data => t.log(data));

    uploader.close();
    await once(uploader, 'close');
    await publicCenter.stop();
});