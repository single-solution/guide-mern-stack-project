const express = require("express");
const { jwtAuthentication } = require("../middlewares/authentications/jwtAuthentication.js");

const { userAuthorization } = require("../middlewares/authentications/userAuthorization.js");
const { getSubscribers, updateSubscriber, deleteSubscriber } = require("../controllers/subscribers.js");

const router = express.Router();

router.get("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), getSubscribers);
router.put("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), updateSubscriber);
router.delete("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), deleteSubscriber);

module.exports = router;
