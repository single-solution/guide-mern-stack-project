module.exports = {
	apps: [
		{
			name: "sample-server",
			script: "./index.js", // replace with your start file, like 'app.js'
			watch: true, // Enables watching for file changes
			ignore_watch: ["node_modules", "assets"],
			watch_options: {
				followSymlinks: false,
			},
			env: {
				NODE_ENV: "development", // Set environment variables here
				// Other environment variables
			},
			env_production: {
				NODE_ENV: "production",
				// Other production environment variables
			},
		},
	],
};
