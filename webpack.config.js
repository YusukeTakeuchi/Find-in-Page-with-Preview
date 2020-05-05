const path = require('path');

module.exports = {
  mode: 'development',

  devtool: 'inline-source-map',

  entry: {
      bg: './src/bg/bg.ts',
      content: './src/content-scripts/content.ts',
      options: './src/options/options.ts',
      "find-window": './src/find-window/find-window.ts',
  },

  output: {
    path: path.join(__dirname, 'webext', 'out'),
    filename: '[name].js',
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  module: {
    rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
        }
    ]
  }
};