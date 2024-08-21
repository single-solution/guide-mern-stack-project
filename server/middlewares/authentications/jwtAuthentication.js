// Import necessary modules
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { sendJsonResponse } = require("../../utils/helpers.js");

// Define the path to the public and private key files
const publicKeyPath = path.join(__dirname, "../../assets/encryptionKeys/publicKey.key");
const privateKeyPath = path.join(__dirname, "../../assets/encryptionKeys/privateKey.key");

// Function to generate and save RSA keys if they don't exist
const generateAndSaveRSAKeys = () => {
	const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
		modulusLength: 2048,
		publicKeyEncoding: { type: "spki", format: "pem" },
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
	});

	// Ensure the directory exists
	const encryptionKeysPath = path.dirname(publicKeyPath);
	if (!fs.existsSync(encryptionKeysPath)) {
		fs.mkdirSync(encryptionKeysPath, { recursive: true });
	}

	// Write the keys to the file system
	fs.writeFileSync(privateKeyPath, privateKey);
	fs.writeFileSync(publicKeyPath, publicKey);
};

// Check if public and private keys exist, if not, generate them
if (!fs.existsSync(publicKeyPath) || !fs.existsSync(privateKeyPath)) {
	generateAndSaveRSAKeys();
}

// Read public key file synchronously
const publicKEY = fs.readFileSync(publicKeyPath, "utf8");

// Middleware function for JWT authentication
exports.jwtAuthentication = (request, response, next) => {
	try {
		// Extract authorization header from request
		const authHeader = request.headers?.authorization;

		// If authorization header is missing, return appropriate response
		if (!authHeader) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "Missing Authentication token", null);
		}

		// Extract token from authorization header
		const token = authHeader.split(" ")[1];

		// Verify token using public key
		jwt.verify(token, publicKEY, LOGIN_TOKEN_PREFERENCES, (error, data) => {
			// Handle verification errors
			if (error) {
				switch (error.name) {
					case "TokenExpiredError":
						// Return response for expired token
						return sendJsonResponse(response, HTTP_STATUS_CODES.INVALID_TOKEN, false, "Login Expired!", error);
					case "JsonWebTokenError":
						// Return response for invalid token
						return sendJsonResponse(
							response,
							HTTP_STATUS_CODES.INVALID_TOKEN,
							false,
							"Invalid Authentication Token!",
							error,
						);
					default:
						// Return response for other token processing errors
						return sendJsonResponse(
							response,
							HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
							false,
							"Token cannot be processed",
							error,
						);
				}
			}

			// If token is valid, attach payload to request and proceed to next middleware
			request.jwtPayload = data;
			next();
		});
	} catch (error) {
		// Handle server error
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Request cannot be processed", null);
	}
};
