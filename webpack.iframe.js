const { merge } = require('webpack-merge');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const terserWebpackPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.js');

const minify = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
};

module.exports = () => merge(common, {
  mode: 'production',

  entry: {
    index: [
      'core-js/stable',
      path.resolve(__dirname, 'src/index-internal.ts'),
    ],
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/v1/elements'),
  },

  optimization: {
    runtimeChunk: false,
    minimizer: [new terserWebpackPlugin()],
  },
  module: {
    rules: [],
  },

  // todo: add minifier for css in html file
  plugins: [
    new HtmlWebPackPlugin({
      filename: 'index.html',
      template: 'assets/iframe.html',
      chunks: ['index'],
      inject: 'head',
      minify,
    }),
    new CleanWebpackPlugin({
      verbose: true,
      dry: false,
    }),
    new WebpackManifestPlugin(),
    new CompressionPlugin(),
  ],
});
