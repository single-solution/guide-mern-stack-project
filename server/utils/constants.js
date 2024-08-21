// limit each IP to 1000 requests per windowMs (15 minutes)
global.EXPRESS_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 1000 };

// Set login token expiry for 7 Days and RS256 bit encryption
global.LOGIN_TOKEN_PREFERENCES = { expiresIn: "7d", algorithm: "RS256" };

global.HTTP_STATUS_CODES = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOTFOUND: 404,
	NOT_ACCEPTABLE: 406,
	CONFLICT: 409,
	GONE: 410,
	UNPROCESSABLE_ENTITY: 422,
	INVALID_TOKEN: 498,
	INTERNAL_SERVER_ERROR: 500,
};

global.STRIPE_EVENTS = {
	SESSION_COMPLETED: "checkout.session.completed",
	PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
	PAYMENT_FAILED: "invoice.payment_failed",
};

global.USER_FIELDS_UPDATE_BY_ADMIN_ONLY = [
	"passwordReset",
	// "userRole",
	"isActive",
	"isFeatured",
	"createdBy",
	"updatedBy",
];

global.GUESTS_GENERAL_IGNORED_FIELDS = {
	isActive: 0,
	createdBy: 0,
	updatedBy: 0,
	createdAt: 0,
	updatedAt: 0,
};
