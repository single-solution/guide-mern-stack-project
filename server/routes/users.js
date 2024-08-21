const express = require("express");
const { jwtAuthentication } = require("../middlewares/authentications/jwtAuthentication.js");

const {
	getUser,
	login,
	register,
	updateUser,
	updatePassword,
	sendPasswordResetEmail,
	passwordResetUsingVerificationEmail,
	deleteUser,
	createSubAdmin,
	sendUserVerificationEmail,
	verifyUserEmailByOTP,
} = require("../controllers/users.js");
const { userAuthorization } = require("../middlewares/authentications/userAuthorization.js");
const multerMiddleware = require("../middlewares/storage/multerMiddleware.js");

const router = express.Router();

router.get("/", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), getUser);
router.post("/", multerMiddleware(), register);
router.put("/", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), multerMiddleware(), updateUser);
router.delete("/", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), deleteUser);

router.post("/sub-admin", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), createSubAdmin);

router.post("/password", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), updatePassword);
router.patch("/password", passwordResetUsingVerificationEmail);

router.post("/login", login);
router.post("/send-password-reset-email", sendPasswordResetEmail);
router.get("/verify/email", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), sendUserVerificationEmail);
router.post("/verify/otp", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), verifyUserEmailByOTP);

module.exports = router;
