/* eslint-disable */
const path = require('path');
const merge = require('webpack-merge');

const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');

const pretty = (it) => JSON.stringify(it, null, '  ');

const baseConfig = () => ({
    module: {
        rules: [
            {
                exclude: /node_modules/,
                test: /\.jsx?$/,
                use: ['babel-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.es.js', '.js', '.jsx'],
    },
});

const demoConfig = ({ backendHost, isDemo, monitorBuild, rootDir }) => {
    if (!isDemo) {
        return {};
    }

    return {
        devServer: {
            historyApiFallback: true,
            //host: '127.0.0.1',
            hot: true,
            inline: true,
            //port: 8081,
            proxy: {
                '/api/*': {
                    target: backendHost,
                    changeOrigin: true,
                    secure: false
                }
            },
        },
        devtool: 'inline-source-map',
        entry: path.resolve(rootDir, './demo/demo.js'),
        output: {
            filename: '[name].js?[hash:13]',
            path: path.resolve(rootDir, './dist'),
            pathinfo: true,
            publicPath: '/',
        },
        plugins: [
            new webpack.HotModuleReplacementPlugin(),
            new HtmlWebpackPlugin(),
            monitorBuild ? new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                openAnalyzer: false,
            }) : null,
        ].filter(Boolean),
        //watch: true,
    };
};


const testConfig = ({ isTest, rootDir }) => {
    if (!isTest) {
        return {};
    }

    return {
        devtool: 'inline-source-map',
        node: {
            fs: 'empty',
            net: 'empty',
        },
        resolve: {
            alias: {
                module: path.resolve(rootDir, './src'),
            },
        },
    };
};



module.exports = (env = {}, argv = {}) => {

    // The NODE_ENV controls which build will run, you can override this
    // via --env.NODE_ENV on the console, if necessary
//    const NODE_ENV = env.NODE_ENV || process.env['NODE_ENV'] || 'development';
    const NODE_ENV = env.demo ? 'demo' : (process.env.NODE_ENV || 'development');

    const webpackMode = (argv.mode || NODE_ENV) === 'production' ? 'production' : 'development';


    const backendHost = process.env['DBF_BACKEND'] || 'https://localhost';
    const isDev = NODE_ENV === 'development';
    const isDemo = NODE_ENV === 'demo';
    const isProd = NODE_ENV === 'production';
    const isTest = NODE_ENV === 'test';

    const settings = {
        backendHost,
        isDev,
        isDemo,
        isProd,
        isTest,
        monitorBuild: Boolean(env.monitor),
        rootDir: path.resolve(__dirname, './'),
    };

    console.log('Running webpack with NODE_ENV ' + NODE_ENV, 'with webpack env', env);

    if (env.verbose) {
        // eslint-disable-next-line no-console
        console.log('webpack.settings', pretty(settings));
    }

    // Smart merging tries to fuse loaders that share matching tests
    // See https://github.com/survivejs/webpack-merge#mergesmartconfiguration-configuration
    const appConfig = merge.smart(
        baseConfig(settings),
        testConfig(settings),
        demoConfig(settings),
        {
            mode: webpackMode,
            plugins: [
                new webpack.DefinePlugin({
                    'process.env': {
                        NODE_ENV: JSON.stringify(NODE_ENV),
                    },
                }),
            ],
        }
    );

    if (env.verbose) {
        // eslint-disable-next-line no-console
        console.log('webpack.config', pretty(appConfig));
    }

    return appConfig;
};
