import QuoteCenter from '.';

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(-1);
});
process.on('uncaughtException', (err) => {
    console.log(err);
    process.exit(-1);
});

const main = new QuoteCenter();

main.start()
    .catch(err => {
        console.log(err);
        process.exit(-1);
    }).then(() => {
        process.once('SIGINT', () => {
            process.once('SIGINT', () => process.exit(-1));
            main.destructor();
        });
    });