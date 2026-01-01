const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',

    entry: {
      content: './src/content/content.ts',
      popup: './src/popup/popup.ts',
      background: './src/background/background.ts',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },

    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
          },
          {
            from: 'src/popup/popup.html',
            to: 'popup.html',
          },
          {
            from: 'src/popup/popup.css',
            to: 'popup.css',
          },
          {
            from: 'src/content/content.css',
            to: 'content.css',
          },
        ],
      }),
    ],

    optimization: {
      minimize: isProduction,
    },
  };
};
