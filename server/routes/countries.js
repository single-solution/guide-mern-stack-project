const express = require("express");
const { jwtAuthentication } = require("../middlewares/authentications/jwtAuthentication.js");

const { getCountries, createCountry, updateCountry, deleteCountry } = require("../controllers/countries.js");
const { userAuthorization } = require("../middlewares/authentications/userAuthorization.js");

const router = express.Router();

router.get("/", getCountries);
router.post("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), createCountry);
router.put("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), updateCountry);
router.delete("/", jwtAuthentication, userAuthorization(["admin", "subAdmin"]), deleteCountry);

module.exports = router;
