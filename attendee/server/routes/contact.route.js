const express = require("express");
const { submitContactInquiry } = require("../controllers/contact.controller");

const router = express.Router();

router.post("/", submitContactInquiry);

module.exports = router;
