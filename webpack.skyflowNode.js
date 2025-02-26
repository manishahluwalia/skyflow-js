const { merge } = require('webpack-merge');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const terserWebpackPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = () => merge(common, {
  mode: 'production',
  entry: {
    index: ['core-js/stable', path.resolve(__dirname, 'src/index-node.ts')],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/sdkNodeBuild'),
    library: 'Skyflow',
    libraryTarget: 'umd',
    globalObject: 'this',
    umdNamedDefine: true,
  },
  optimization: {
    runtimeChunk: false,
    minimizer: [new terserWebpackPlugin()],
  },
  module: {
    rules: [],
  },
  plugins: [
    new CleanWebpackPlugin({
      verbose: true,
      dry: false,
    }),
    new WebpackManifestPlugin(),
    new CompressionPlugin(),
  ],
});
