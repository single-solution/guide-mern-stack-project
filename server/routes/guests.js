const express = require("express");
const { subscribeToWebsite, getMedia } = require("../controllers/guest");

const router = express.Router();

router.get("/media", getMedia);
router.post("/subscribe-to-website", subscribeToWebsite);

module.exports = router;
