/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : ESLint flat configuration (ESLint 9+) for the GeoResponse
 *                frontend: TypeScript, React, and React Hooks rules per
 *                docs/05_engineering/CODING_STANDARDS.md sections 12-13.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
const js = require("@eslint/js");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
	{
		ignores: ["dist/**", "node_modules/**", "coverage/**"]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		// Root-level build/tooling config files are plain Node CommonJS
		// (required by Rspack/PostCSS/Tailwind's own config-loading
		// conventions), not TypeScript/React application source - give
		// them a Node environment instead of flagging require()/module/
		// process/__dirname as undefined browser globals.
		files: ["*.config.js"],
		languageOptions: {
			sourceType: "commonjs",
			globals: {
				module: "writable",
				exports: "writable",
				require: "readonly",
				process: "readonly",
				__dirname: "readonly"
			}
		},
		rules: {
			"@typescript-eslint/no-require-imports": "off"
		}
	},
	{
		files: ["**/*.{ts,tsx}"],
		plugins: {
			react,
			"react-hooks": reactHooks
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: { jsx: true }
			}
		},
		settings: {
			react: { version: "detect" }
		},
		rules: {
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			"react/react-in-jsx-scope": "off",
			"react/prop-types": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
			],
			"@typescript-eslint/no-explicit-any": "warn"
		}
	},
	{
		files: ["**/*.test.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off"
		}
	}
);
