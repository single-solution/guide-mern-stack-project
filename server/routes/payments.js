const express = require("express");
const { jwtAuthentication } = require("../middlewares/authentications/jwtAuthentication.js");

const { getPaymentSession, handleWebhook, getPaymentInfo, cancelSubscriptionPlan } = require("../controllers/payments.js");
const { userAuthorization } = require("../middlewares/authentications/userAuthorization.js");

const router = express.Router();

router.get("/", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), getPaymentInfo);
router.get("/session", jwtAuthentication, userAuthorization(["user"]), getPaymentSession);
router.post("/webhook", handleWebhook);

router.delete("/subscription", jwtAuthentication, userAuthorization(["admin", "subAdmin", "user"]), cancelSubscriptionPlan);

module.exports = router;
