const { sendJsonResponse, sendEmail } = require("../utils/helpers.js");
const newsletters = require("../models/newsletters.js");

const getNewsletters = async (request, response) => {
	try {
		const { _id: newsletterID, page, limit } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!newsletterID && (!page || !limit)) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const dbNewsletters = await newsletters
			.find(newsletterID ? { _id: newsletterID } : {})
			.limit(limit)
			.skip(page && (page - 1) * limit);

		if (dbNewsletters.length > 0) {
			return sendJsonResponse(
				response,
				HTTP_STATUS_CODES.OK,
				true,
				"Record Found!",
				newsletterID ? dbNewsletters[0] : dbNewsletters,
			);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "Record not Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const sendNewsletterToEmails = async (request, response) => {
	let emailFailures = [];
	let emailSuccesses = [];

	const payload = request.body;
	const { userID: authenticatingUserID } = request.jwtPayload;

	if (!payload?.message) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
	}

	// Combine and deduplicate emails
	const userEmails = payload?.userEmails || [];
	const subscriberEmails = payload?.subscriberEmails || [];
	const subAdminEmails = payload?.subAdminEmails || [];
	const emailsToSendNewsletter = [...new Set([...userEmails, ...subscriberEmails, ...subAdminEmails])];

	// Email replacements
	const emailReplacements = { subject: "123SurplusList News Alert", message: payload?.message };

	// Send emails concurrently
	const sendEmailPromises = emailsToSendNewsletter.map(async (email) => {
		try {
			const emailSent = await sendEmail(email, emailReplacements, "newsletter.html");
			if (emailSent) {
				emailSuccesses.push(email);
			} else {
				emailFailures.push(email);
			}
		} catch (error) {
			emailFailures.push(email);
		}
	});

	// Wait for all email send attempts to complete
	await Promise.all(sendEmailPromises);

	// Save successful emails to the database
	const payloadToSaveInDB = new newsletters({
		...payload,
		emails: emailSuccesses,
		createdBy: authenticatingUserID,
		updatedBy: authenticatingUserID,
	});
	await payloadToSaveInDB.save();

	// Determine response status
	if (emailFailures.length > 0) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.PARTIAL_CONTENT, false, "Some emails failed to send", {
			successes: emailSuccesses,
			failures: emailFailures,
		});
	} else {
		return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "All emails sent successfully", {
			successes: emailSuccesses,
		});
	}
};

const deleteNewsletter = async (request, response) => {
	try {
		const { _id: newsletterID } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!newsletterID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const deletedNewsletter = await newsletters.findOneAndDelete({ _id: newsletterID }, { new: true });

		if (deletedNewsletter) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record delete::success", deletedNewsletter);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record delete::failure", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

module.exports = {
	getNewsletters,
	sendNewsletterToEmails,
	deleteNewsletter,
};
