/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Rspack build configuration for the GeoResponse frontend.
 *                Wires TSX/JSX support via the built-in SWC loader, Tailwind
 *                CSS v4 via PostCSS, the dev server, path aliases matching
 *                tsconfig.json, and build-time injection of the frontend
 *                environment variables.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
const path = require("path");

const rspack = require("@rspack/core");
const ReactRefreshPlugin = require("@rspack/plugin-react-refresh");

const isDev = process.env.NODE_ENV !== "production";

/**
 * Build-time environment variables exposed to the frontend bundle.
 *
 * The build tool is Rspack, not Vite, so these are read as plain
 * `process.env.*` names (no `VITE_` prefix) and injected at build time via
 * DefinePlugin.
 */
const definedEnv = {
	"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
	"process.env.API_BASE_URL": JSON.stringify(
		process.env.API_BASE_URL || "http://localhost:8080/api/v1"
	),
	"process.env.MAP_TILE_URL": JSON.stringify(process.env.MAP_TILE_URL || ""),
	"process.env.LOG_LEVEL": JSON.stringify(process.env.LOG_LEVEL || "debug")
};

/** @type {import("@rspack/cli").Configuration} */
module.exports = {
	mode: isDev ? "development" : "production",
	entry: "./src/main.tsx",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].[contenthash].js",
		publicPath: "/",
		clean: true
	},
	devtool: isDev ? "cheap-module-source-map" : "source-map",
	resolve: {
		extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
		alias: {
			"@common": path.resolve(__dirname, "src/common"),
			"@components": path.resolve(__dirname, "src/components"),
			"@hooks": path.resolve(__dirname, "src/hooks"),
			"@store": path.resolve(__dirname, "src/store"),
			"@api": path.resolve(__dirname, "src/api"),
			"@types": path.resolve(__dirname, "src/types"),
			"@constants": path.resolve(__dirname, "src/constants"),
			"@utils": path.resolve(__dirname, "src/utils"),
			"@assets": path.resolve(__dirname, "src/assets")
		}
	},
	module: {
		rules: [
			{
				test: /\.(t|j)sx?$/,
				exclude: /node_modules/,
				use: {
					loader: "builtin:swc-loader",
					options: {
						jsc: {
							parser: {
								syntax: "typescript",
								tsx: true
							},
							transform: {
								react: {
									runtime: "automatic",
									development: isDev,
									refresh: isDev
								}
							}
						}
					}
				},
				type: "javascript/auto"
			},
			{
				test: /\.css$/i,
				// Disable Rspack's built-in CSS module type so postcss-loader
				// (which runs Tailwind CSS v4 via @tailwindcss/postcss, per
				// index.css's `@import "tailwindcss"` / `@config` directives)
				// is the only thing processing these files.
				type: "javascript/auto",
				use: [
					rspack.CssExtractRspackPlugin.loader,
					"css-loader",
					"postcss-loader"
				]
			},
			{
				test: /\.(woff2?|ttf|eot)$/i,
				type: "asset/resource",
				generator: {
					filename: "fonts/[name][ext]"
				}
			}
		]
	},
	plugins: [
		new rspack.HtmlRspackPlugin({
			template: "./index.html"
		}),
		new rspack.DefinePlugin(definedEnv),
		new rspack.CssExtractRspackPlugin(),
		isDev && new ReactRefreshPlugin()
	].filter(Boolean),
	devServer: {
		port: 5173,
		host: "0.0.0.0",
		open: false,
		hot: true,
		historyApiFallback: true
	}
};
