const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: 'electron-main',
  mode: 'production',
  entry: './dist/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  externals: { 
    electron: 'commonjs electron',
    ws: 'commonjs ws',
    path: 'commonjs path',
    fs: 'commonjs fs',
    util: 'commonjs util',
    events: 'commonjs events',
    'child_process': 'commonjs child_process'
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.js', '.ts', '.json']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'build/Release/*.node', to: 'native/[name][ext]' },
        { from: 'src/status.html', to: 'status.html' },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      }
    ]
  }
};