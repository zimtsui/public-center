module.exports = {
    rules: {
        'no-console': 'warn',
        'no-unused-vars': 'warn',
        'no-new': 'off',
        'no-restricted-syntax': 'off',
        indent: [
            'warn',
            4,
        ],
        'no-await-in-loop': 'off',
        'no-underscore-dangle': [
            'error',
            {
                allowAfterThis: true,
                allowAfterSuper: true,
            },
        ],
        'no-shadow': 'off',
        'max-len': 'warn',
        'no-unused-expressions': 'off',
        eqeqeq: 'off',
        'no-param-reassign': 'off',
    },
};
