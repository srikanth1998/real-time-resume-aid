const path = require('path');

module.exports = {
  target: 'electron-main',
  mode: 'production',
  entry: './dist/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  externals: {
    'ws': 'commonjs ws',
    'electron': 'commonjs electron'
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.js', '.ts', '.json'],
  }
};