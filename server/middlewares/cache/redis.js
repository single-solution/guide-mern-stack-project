const { createHash } = require("crypto");

const cacheOptions = {
	defaultTTL: 3600, // default TTL in seconds
};

// Create a consistent hash key
function generateCacheKey(req) {
	const relevantHeaders = {
		authorization: req.headers.authorization,
	};

	const bodyString = JSON.stringify(req.body, Object.keys(req.body).sort());
	const queryString = JSON.stringify(req.query, Object.keys(req.query).sort());
	const headersString = JSON.stringify(relevantHeaders, Object.keys(relevantHeaders).sort());

	const hash = createHash("sha256");
	hash.update(`${req.originalUrl}-${bodyString}-${queryString}-${headersString}`);
	return hash.digest("hex");
}

// Determine if the content is binary or not
function isBinaryContent(contentType) {
	// Add all binary types you expect to handle
	const binaryContentTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "video/mp4", "application/octet-stream"];
	return binaryContentTypes.includes(contentType);
}

const redisCache =
	(redisClient, options = cacheOptions) =>
	async (req, res, next) => {
		if (req.method !== "GET") {
			return next(); // Skip non-GET requests
		}

		const key = `cache:${generateCacheKey(req)}`;
		const TTL = req.cacheTTL || options.defaultTTL; // Use route-specific TTL or default

		try {
			const cacheResult = await redisClient.get(key);
			if (cacheResult !== null) {
				res.setHeader("X-Cache", "HIT");
				const parsedResult = JSON.parse(cacheResult); // Assume all cache data is stored as JSON

				if (parsedResult.type === "binary") {
					// If the data type is binary, parse the base64 string to a buffer and send as binary content
					const buffer = Buffer.from(parsedResult.data, "base64");
					res.writeHead(200, { "Content-Type": parsedResult.contentType });
					res.end(buffer);
				} else {
					// If the data type is JSON, parse and send as JSON
					res.status(200).json(parsedResult.data);
				}
			} else {
				res.setHeader("X-Cache", "MISS");
				const originalEnd = res.end.bind(res);
				const chunks = [];

				res.end = (chunk, ...args) => {
					if (chunk) {
						chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
					}
					originalEnd(chunk, ...args);
				};

				res.once("finish", async () => {
					const data = Buffer.concat(chunks);
					let dataToCache;
					const contentType = res.getHeader("content-type");

					if (isBinaryContent(contentType)) {
						dataToCache = JSON.stringify({ type: "binary", data: data.toString("base64"), contentType });
					} else {
						// Attempt to parse as JSON, fallback to storing as a regular string
						try {
							const jsonData = JSON.parse(data.toString());
							dataToCache = JSON.stringify({ type: "json", data: jsonData });
						} catch {
							dataToCache = JSON.stringify({ type: "text", data: data.toString() });
						}
					}

					await redisClient.set(key, dataToCache, { EX: TTL }).catch((cacheError) => {
						console.error("Redis set error:", cacheError);
					});
				});

				next();
			}
		} catch (error) {
			// If there's a JSON parse error, log it and send the raw cache result
			if (error instanceof SyntaxError) {
				console.error("Cached data is not valid JSON, sending as raw data");
				res.end(cacheResult);
			} else {
				console.error("Redis get error:", error);
				next(error);
			}
		}
	};

module.exports = { redisCache };
