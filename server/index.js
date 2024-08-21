// Import necessary modules
require("dotenv").config();
require("./utils/constants.js");
const express = require("express");
const http = require("http");
const cors = require("cors");
// const helmet = require("helmet");
// const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
// const redis = require("redis");

// Utils and middlewares
const { sendJsonResponse } = require("./utils/helpers");
// const { redisCache } = require("./middlewares/cache/redis");

// Constants and configurations
const PORT = process.env.PORT || 3000;

// Initialize express app and HTTP server
const app = express();
const server = http.createServer(app);

// // Initialize Redis client
// // Connect to Redis with a promise
// const redisClient = redis.createClient({ host: "localhost", port: 6379 });
// redisClient
// 	.connect()
// 	.then(() => {
// 		console.log("Connected to Redis");
// 	})
// 	.catch((err) => {
// 		console.error("Could not connect to Redis:", err);
// 		process.exit(1); // Exit if there is a connection error
// 	});

// // Security and Rate Limiting middlewares
// app.use(helmet());
// app.use(rateLimit(EXPRESS_RATE_LIMIT));

// Raw endpoints
app.post("/v1/payments/webhook", express.raw({ type: "application/json" }));

// Body parsers for json and urlencoded data
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

// // CORS configuration
const corsOptions = {
	origin: function (origin, callback) {
		if (!origin || process.env.ALLOWED_ORIGINS.split(",").indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	credentials: true,
};
// app.use(cors(corsOptions));
app.use(cors());

// Connect to MongoDB
mongoose
	.connect(process.env.MONGO_DB_CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		console.log(`Database connected successfully`);
	})
	.catch((err) => {
		console.error("Database connection error:", err);
		process.exit(1);
	});

// // Set up cache middleware
// app.use((req, res, next) => {
// 	redisCache(redisClient)(req, res, next);
// });

// Socket.io for real-time communication
const io = require("socket.io")(server, { maxHttpBufferSize: 1e8, cors: corsOptions });
require("./middlewares/socket")(io); // Assuming this sets up your socket.io middleware

app.use("/v1/categories", require("./routes/categories.js"));
app.use("/v1/countries", require("./routes/countries.js"));
app.use("/v1/coupons", require("./routes/coupons.js"));
app.use("/v1/subscriptions", require("./routes/subscriptions.js"));
app.use("/v1/subscribers", require("./routes/subscribers.js"));
app.use("/v1/newsletters", require("./routes/newsletters.js"));
app.use("/v1/payments", require("./routes/payments.js"));
app.use("/v1/guests", require("./routes/guests.js"));
app.use("/v1/chats", require("./routes/chats.js"));
app.use("/v1/migrations", require("./routes/migrations.js"));
app.use("/v1/notifications", require("./routes/notifications.js"));
app.use("/v1/users", require("./routes/users.js"));

// Welcome route
app.get("/", (req, res) => res.send("Welcome to the server"));
app.get("/v1", (req, res) => res.send("Welcome to the server, You are using api version 1"));

// Error handling middleware
app.use((error, req, res, next) => {
	console.error(error);
	return sendJsonResponse(res, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "An error occurred", error.message);
});

// Start server
server.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
	console.log(`Environment: ${process.env.ENVIRONMENT_STATUS}`);
});
