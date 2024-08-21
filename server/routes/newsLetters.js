const express = require("express");
const { jwtAuthentication } = require("../middlewares/authentications/jwtAuthentication.js");

const { getNewsletters, sendNewsletterToEmails, deleteNewsletter } = require("../controllers/newsletters.js");
const { userAuthorization } = require("../middlewares/authentications/userAuthorization.js");

const router = express.Router();

router.get("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), getNewsletters);
router.delete("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), deleteNewsletter);

router.post("/email", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), sendNewsletterToEmails);

module.exports = router;
