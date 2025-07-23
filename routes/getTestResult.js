const { getTestResultPage } = require("../controllers/getTestResultController");
const express = require("express");

const router = express.Router();

router.post("/", getTestResultPage);
module.exports = router;
