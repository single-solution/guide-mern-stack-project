const bcrypt = require("bcrypt");
const users = require("../models/users");
const countries = require("../models/countries");
const usersJsonData = require("../utils/migrations/users.json");
const countriesJsonData = require("../utils/migrations/countries.json");
const { sendJsonResponse } = require("../utils/helpers");
const fs = require("fs");

const directoriesToCreateInAssets = ["./assets/images", "./assets/videos"];

const installSampleDB = async (request, response) => {
	let successMessage = {};

	try {
		// Step 1: Create assets directories
		for (let directory of directoriesToCreateInAssets) {
			fs.mkdirSync(directory, { recursive: true });
		}

		// Step 2: Create users
		for (const user of usersJsonData) {
			user.password = await bcrypt.hash(user.password, 12);
			await users.create(user);
		}
		successMessage.users = "Users Created::Success";

		// Step 1: Create users
		for (const country of countriesJsonData) {
			await countries.create(country);
		}
		successMessage.countries = "Countries List Created::Success";

		// Successfully completed all steps
		return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, successMessage, null);
	} catch (error) {
		// Handle any error that occurred in the above steps
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error.message || error,
		});
	}
};

module.exports = {
	installSampleDB,
};
