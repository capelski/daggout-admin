const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { resolve } = require('path');
// const webpack = require('webpack');

module.exports = {
    entry: './src/index.tsx',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                options: {
                    configFileName: './tsconfig.json'
                }
            },
            {
                test: /\.scss$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
            },
            {
                test: /\.html$/,
                use: [
                    {
                        loader: 'html-loader'
                    }
                ]
            }
        ]
    },
    output: {
        filename: 'main.js',
        path: resolve(__dirname, '..', '..', '..', 'docs'),
        publicPath: '/daggout-admin/'
    },
    plugins: [
        // new webpack.DefinePlugin({
        //     'process.env.PRODUCTION_URL_BASE': JSON.stringify('https://capelski.github.io')
        // }),
        new MiniCssExtractPlugin({
            filename: 'main.css'
        }),
        new HtmlWebpackPlugin({
            filename: './index.html',
            template: './src/index.html'
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'assets'
                }
            ]
        })
    ],
    resolve: {
        extensions: ['.js', '.ts', '.tsx', '.scss']
    }
};
