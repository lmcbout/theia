/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

// @ts-check
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const outputPath = path.resolve(__dirname, 'lib');

const monacoEditorPath = '../../node_modules/monaco-editor-core/min/vs';
const monacoLanguagesPath = '../../node_modules/monaco-languages/release';
const monacoCssLanguagePath = '../../node_modules/monaco-css/release/min';
const monacoTsLanguagePath = '../../node_modules/monaco-typescript/release';
const monacoJsonLanguagePath = '../../node_modules/monaco-json/release/min';
const monacoHtmlLanguagePath = '../../node_modules/monaco-html/release/min';
const GlobalizePlugin = require("globalize-webpack-plugin");

module.exports = {
    entry: path.resolve(__dirname, 'src-gen/frontend/index.js'),
    output: {
        filename: 'bundle.js',
        path: outputPath
    },
    target: 'electron-renderer',
    node: {
        __dirname: false,
        __filename: false
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.(ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                loader: 'url-loader?limit=10000&mimetype=image/svg+xml'
            },
            {
                test: /\.js$/,
                enforce: 'pre',
                loader: 'source-map-loader'
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "url-loader?limit=10000&mimetype=application/font-woff"
            }
        ],
        noParse: /vscode-languageserver-types|vscode-uri/
    },
    resolve: {
        extensions: ['.js'],
        alias: {
            'vs': path.resolve(outputPath, monacoEditorPath)
        }
    },
    devtool: 'source-map',
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new CopyWebpackPlugin([
            {
                from: monacoEditorPath,
                to: 'vs'
            },
            {
                from: monacoLanguagesPath,
                to: 'vs/basic-languages'
            },
            {
                from: monacoCssLanguagePath,
                to: 'vs/language/css'
            },
            {
                from: monacoTsLanguagePath,
                to: 'vs/language/typescript'
            },
            {
                from: monacoJsonLanguagePath,
                to: 'vs/language/json'
            },
            {
                from: monacoHtmlLanguagePath,
                to: 'vs/language/html'
            }
        ]),
        new CircularDependencyPlugin({
            exclude: /(node_modules|examples)\/./,
            failOnError: false // https://github.com/nodejs/readable-stream/issues/280#issuecomment-297076462
        }),
        new GlobalizePlugin({
            production: false, // true: production, false: development
            developmentLocale: "en", // locale to be used for development.
            supportedLocales: ["en", "es", "fr"], // locales that should be built support for.
            output: "__dirname/i18n/[locale].hash.js", // build output.
            tempdirBase: "__dirname/i18n/[locale].js", // optional for non create-react-apps
        })
    ],
    stats: {
        warnings: true
    }
};