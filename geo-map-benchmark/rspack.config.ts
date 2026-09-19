import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rspack/cli';
import { HtmlRspackPlugin } from '@rspack/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  mode: isProduction ? 'production' : 'development',
  entry: {
    main: './src/main.tsx',
    // Headless automation entry, see src/harness.ts and scripts/runBenchmarks.mjs.
    harness: './src/harness.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
    chunkFilename: isProduction ? 'chunks/[name].[contenthash:8].js' : 'chunks/[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            transform: { react: { runtime: 'automatic' } },
          },
        },
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new HtmlRspackPlugin({ template: './public/index.html', filename: 'index.html', chunks: ['main'] }),
    new HtmlRspackPlugin({ template: './public/harness.html', filename: 'harness.html', chunks: ['harness'] }),
  ],
  devServer: {
    port: 5173,
    open: false,
    static: { directory: path.resolve(__dirname, 'public') },
  },
  devtool: isProduction ? false : 'eval-cheap-module-source-map',
});
