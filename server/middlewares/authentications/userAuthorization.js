const { sendJsonResponse } = require("../../utils/helpers.js");

exports.userAuthorization = (allowedRoles) => {
	return (request, response, next) => {
		try {
			const userRole = request.jwtPayload.userRole;

			if (userRole && allowedRoles.includes(userRole)) {
				next(); // User has the required role, proceed to the route handler
			} else {
				return sendJsonResponse(
					response,
					HTTP_STATUS_CODES.UNAUTHORIZED,
					false,
					"Access denied. Insufficient privileges!",
					null,
				);
			}
		} catch (error) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
				error: error.message || error,
			});
		}
	};
};
