import test from 'ava';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { assert } = chai;
import axios from 'axios';
import fse from 'fs-extra';
import path from 'path';
import QuoteCenter from '../..';

const config = fse.readJsonSync(path.join(__dirname,
    '../../cfg/config.json'));

test.serial('start and stop', async t => {
    const quoteCenter = new QuoteCenter();
    t.log('starting');
    await quoteCenter.start();
    t.log('started');
    t.log('stopping');
    quoteCenter.stop();
});

test.serial.only('upload', async t => {
    // const quoteCenter = new QuoteCenter();
    // await quoteCenter.start();
});