'use strict';

module.exports = (pandora) => {
    pandora
        .process('process1')
        .scale(1)
        .env({
            NODE_ENV: pandora.env ? 'development' : 'production',
        });

    pandora
        .service('quote-center', './')
        .process('process1');

    /**
     * you can also use cluster mode to start application
     */
    // pandora
    //   .cluster('./');

    /**
     * you can create another process here
     */
    // pandora
    //   .process('background')
    //   .nodeArgs(['--expose-gc']);

    /**
     * more features please visit our document.
     * https://github.com/midwayjs/pandora/
     */

};