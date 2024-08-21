// .eslintrc.js
module.exports = {
	env: {
		commonjs: true,
		es2021: true,
		node: true,
	},
	extends: ["eslint:recommended"],
	parserOptions: {
		ecmaVersion: "latest",
	},
	rules: {
		"max-len": ["error", { code: 130 }],
		indent: ["error", "tab", { SwitchCase: 1, ignoredNodes: ['ObjectExpression > :matches(> [type="Property"])'] }],
		"no-tabs": 0,
		semi: ["error", "always"],
		quotes: ["error", "double"],
		camelcase: ["error", { properties: "always" }],
		// Add other ESLint rules you want to enforce here.
	},
	globals: {
		// Add global variables as needed
		// value: "readonly",
	},
};
