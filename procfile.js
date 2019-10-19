'use strict';

const { autoExitDecorator } = require('autonomous');
const { PandoraKita } = require('pandora-kita');
const PublicCenter = require('./').default;

module.exports = (pandora) => {
    pandora
        .process('process1')
        .scale(1)
        .env({
            NODE_ENV: pandora.dev ? 'development' : 'production',
        });

    pandora
        .service('kita', PandoraKita)
        .process('weak-all');

    pandora
        .service(
            'public-center',
            autoExitDecorator(3000)(PublicCenter)
        ).dependency('kita')
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