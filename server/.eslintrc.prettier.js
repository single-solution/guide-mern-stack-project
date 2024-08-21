// .eslintrc.prettier.js
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
		"no-magic-numbers": "off",
		"spaced-comment": "off",
		"wrap-regex": "off",
		"vue/script-indent": "off",
		"no-mixed-spaces-and-tabs": "off",
		// Add other ESLint rules you want to enforce here.
	},
};
