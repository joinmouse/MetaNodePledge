const { merge } = require('webpack-merge');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const base = require('./webpack.config.base');

base.output.publicPath = './';

module.exports = merge(base, {
  mode: 'production',
  performance: {
    hints: false, // 禁用性能提示
  },
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all', // 提取公共代码
      minSize: 30000,
      maxSize: 244000,
      minChunks: 1,
      maxAsyncRequests: 6,
      maxInitialRequests: 4,
      automaticNameDelimiter: '~',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true, // 开启并行压缩
        extractComments: false, // 去除 js 中的注释
        terserOptions: {
          ecma: 6,
          warnings: false,
          format: {
            comments: false,
          },
          compress: {
            drop_console: true, // 去除 console 打印
          },
          ie8: false,
        },
      }),
      new CssMinimizerPlugin({
        parallel: true, // 开启并行压缩
      }),
    ],
  },
  plugins: [new CleanWebpackPlugin()],
});
