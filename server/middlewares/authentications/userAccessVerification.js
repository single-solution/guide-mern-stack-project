const users = require("../../models/users.js");
// const subscriptions = require("../models/subscriptions.js");
const { sendJsonResponse } = require("../../utils/helpers.js");

exports.userAccessVerification = () => {
	return async (request, response, next) => {
		try {
			const { userRole, userID } = request.jwtPayload;

			const userDBPayload = await users.findOne({ _id: userID });

			if (!userDBPayload.isActive) {
				return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Account Disabled By Admin!", null);
			}

			// if (!userDBPayload.isVerified?.status) {
			// 	return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Email Is Not Verified!", null);
			// }

			if (!userDBPayload.isApproved) {
				return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Account Not Approved By Admin!", null);
			}

			// if (userRole === "seller") {
			// 	if (!userDBPayload?.subscription?.subscription) {
			// 		return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "No Active Subscription!", null);
			// 	}

			// 	const subscriptionDBPayload = await subscriptions.findOne({ _id: userDBPayload.subscription.subscription });

			// 	if (!subscriptionDBPayload?._id) {
			// 		return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "Subscription not found!", null);
			// 	}

			// 	if (subscriptionDBPayload.type !== "free" && subscriptionDBPayload.type !== "paid") {
			// 		return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "Invalid subscription type!", null);
			// 	}

			// 	if (subscriptionDBPayload.type === "paid") {
			// 		if (new Date() > new Date(userDBPayload.subscription.expiryDate)) {
			// 			return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "Subscription Expired!", null);
			// 		}

			// 		if (
			// 			userDBPayload?.subscription.paymentStatus !== "paid" ||
			// 			(userDBPayload?.subscription?.isActive && !userDBPayload?.subscription?.isActiveByAdmin)
			// 		) {
			// 			return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "Subscription is inactive!", null);
			// 		}
			// 	}
			// }

			next(); // User has the required role, proceed to the route handler
		} catch (error) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
				error: error.message || error,
			});
		}
	};
};
