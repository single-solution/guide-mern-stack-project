const express = require("express");
const { jwtAuthentication } = require("../middlewares/authentications/jwtAuthentication.js");
const { userAuthorization } = require("../middlewares/authentications/userAuthorization.js");
const multerMiddleware = require("../middlewares/storage/multerMiddleware.js");

const {
	getChat,
	getChatGroups,
	getChatGroupImage,
	createChatGroup,
	updateChatGroup,
	reportMessage,
	deleteChatGroup,
	getChatMessageMedia,
	leaveChatGroup,
	getChatReports,
	updateMessageReportStatus,
	deleteChatMessage,
} = require("../controllers/chats.js");

const router = express.Router();

router.get("/chat", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), getChat);
router.get("/chat/media", getChatMessageMedia);
router.delete("/chat/message", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), deleteChatMessage);
router.get("/chat/report-message", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), getChatReports);
router.post("/chat/report-message", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), reportMessage);
router.put("/chat/report-message", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), updateMessageReportStatus);

router.get("/groups", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), getChatGroups);
router.post("/groups", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), multerMiddleware(), createChatGroup);
router.put("/groups", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), multerMiddleware(), updateChatGroup);
router.delete("/groups/leave", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), multerMiddleware(), leaveChatGroup);
router.delete("/groups", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), deleteChatGroup);
router.get("/groups/media", getChatGroupImage);

module.exports = router;
