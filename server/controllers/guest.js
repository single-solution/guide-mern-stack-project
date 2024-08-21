const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { sendJsonResponse } = require("../utils/helpers");
const subscribers = require("../models/subscribers");

const placeholderImage = path.join(__dirname, "../assets/placeholders/square-banner.webp");
const mediaFilePath = path.join(__dirname, "../assets");

const util = require("util");
const readFileAsync = util.promisify(fs.readFile);

const getMedia = async (request, response) => {
	try {
		const { filename, width, mimetype } = request.query;

		if (!filename || !mimetype) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const fileFullPath = path.join(mediaFilePath, mimetype.startsWith("video") ? "videos" : "images", filename);
		const isFileExists = fs.existsSync(fileFullPath);

		// Read the file asynchronously
		let contentBuffer;
		if (mimetype.startsWith("image")) {
			// For images, optionally resize based on the provided width
			const sourceFile = await readFileAsync(isFileExists ? fileFullPath : placeholderImage);
			contentBuffer = width ? await sharp(sourceFile).resize(parseInt(width)).toBuffer() : sourceFile;
		} else {
			// For videos, simply read the file
			contentBuffer = await readFileAsync(fileFullPath);
		}

		response.writeHead(200, {
			"Content-Type": mimetype,
			"Accept-Ranges": "bytes", // Enable support for Range requests for videos
			"Content-Length": contentBuffer.length, // Set the content length
			"Cache-Control": "public, max-age=31536000", // Cache the content for performance
		});

		response.end(optimizedImage);
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", error);
	}
};

const subscribeToWebsite = async (request, response) => {
	const { email } = request.body;

	try {
		if (!email) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const subscriberToSaveInDB = new subscribers({ email: email });
		await subscriberToSaveInDB.save();

		if (subscriberToSaveInDB) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record created::success", subscriberToSaveInDB);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record created::failure", null);
		}
	} catch (error) {
		if (error.code === 11000) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Email already exists", null);
		}

		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

module.exports = { getMedia, subscribeToWebsite };
