const userNotifications = require("../models/userNotifications.js");
const users = require("../models/users.js");
const { sendJsonResponse } = require("../utils/helpers.js");

const getUserNotifications = async (request, response) => {
	let query = {};
	let dbPayload = {};

	try {
		const payload = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!payload?.page || !payload?.limit) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });

		if (payload?.userID && authenticatingDBUser?.userRole === "admin") query.user = payload?.userID;
		else query.user = authenticatingUserID;

		if (payload?.isRead) query.isRead = payload?.isRead;
		if (payload?.messageIsRead) query["message.isRead"] = payload?.messageIsRead;
		if (payload?.notificationType) query.type = payload.notificationType;

		dbPayload = await userNotifications
			.find(query)
			.populate("message.group message.sender request.group request.sender")
			.limit(payload?.limit)
			.skip(payload?.page && (payload?.page - 1) * payload?.limit)
			.sort({ updatedAt: -1 });

		if (dbPayload.length > 0) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Records Found!", dbPayload);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "Records not Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const createUserNotification = async (payload) => {
	try {
		// if (!payload.title) {
		// 	return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		// }

		const dbNewRecordObject = new userNotifications({
			...payload,
			createdBy: payload?.authenticatingUserID,
			updatedBy: payload?.authenticatingUserID,
		});

		const dbCreatedPayload = await dbNewRecordObject.save();

		if (dbCreatedPayload) return dbCreatedPayload;
		else return null;
	} catch (error) {
		return error;
	}
};

const updateUserNotification = async (request, response) => {
	try {
		const payload = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!payload._id) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const dbUpdatedPayload = await userNotifications.findOneAndUpdate(
			{ _id: payload._id },
			{ $set: { ...payload, updatedBy: authenticatingUserID } },
			{ new: true },
		);

		if (dbUpdatedPayload) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", dbUpdatedPayload);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const markNotificationsAsRead = async (request, response) => {
	try {
		const payload = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!payload?.notificationIDs) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const dbUpdatedPayload = await userNotifications.updateMany(
			{ _id: { $in: payload.notificationIDs } },
			{
				$set: {
					isRead: true,
					"message.isRead": true,
					"invite.isRead": true,
					"request.isRead": true,
					updatedBy: authenticatingUserID,
				},
			},
		);

		if (dbUpdatedPayload) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", dbUpdatedPayload);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const deleteUserNotification = async (request, response) => {
	try {
		const { _id: deletingItemID } = request.query;

		if (!deletingItemID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const dbDeletedPayload = await userNotifications.findOneAndDelete({ _id: deletingItemID }, { new: true });

		if (dbDeletedPayload) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record delete::success", dbDeletedPayload);
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
	getUserNotifications,
	createUserNotification,
	updateUserNotification,
	markNotificationsAsRead,
	deleteUserNotification,
};
