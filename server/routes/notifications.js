const express = require("express");
const { jwtAuthentication } = require("../middlewares/authentications/jwtAuthentication.js");

const {
	getUserNotifications,
	updateUserNotification,
	deleteUserNotification,
	markNotificationsAsRead,
} = require("../controllers/userNotifications.js");
const { userAuthorization } = require("../middlewares/authentications/userAuthorization.js");

const router = express.Router();

router.get("/users", jwtAuthentication, userAuthorization(["admin", "subAdmin", "subAdmin", "user"]), getUserNotifications);
router.put("/users", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), updateUserNotification);
router.delete("/users", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), deleteUserNotification);

router.put(
	"/users/read",
	jwtAuthentication,
	userAuthorization(["admin", "subAdmin", "subAdmin", "user"]),
	markNotificationsAsRead,
);

module.exports = router;
