const PrerenderSPAPlugin = require('@dreysolano/prerender-spa-plugin');
const { resolve } = require('path');
const { merge } = require('webpack-merge');
const baseConfig = require('./base.config');

module.exports = merge(baseConfig, {
    mode: 'production',
    plugins: [
        new PrerenderSPAPlugin({
            staticDir: resolve(__dirname, '..', '..', '..', 'docs'),
            routes: ['/receipt-details', '/receipts', '/firebase-stats']
        })
    ]
});
