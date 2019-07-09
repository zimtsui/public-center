module.exports = (api) => {
    api.cache.forever();
    const plugins = [
        '@babel/plugin-transform-runtime',
        'babel-plugin-source-map-support',
        '@babel/plugin-proposal-function-bind',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-partial-application',
        ['@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' }],
        '@babel/plugin-proposal-logical-assignment-operators',
        '@babel/plugin-syntax-dynamic-import',
        'babel-plugin-root-import',
    ];
    return {
        presets: ['@babel/preset-env'],
        plugins,
    };
};
