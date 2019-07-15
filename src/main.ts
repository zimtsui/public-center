import QuoteCenter from '.';

process.on('unhandledRejection', (err) => {
    console.log('unhandledRejection', err);
    process.exit(-1);
});
process.on('uncaughtException', (err) => {
    console.log('uncaughtException', err);
    process.exit(-1);
});

const quoteCenter = new QuoteCenter();

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