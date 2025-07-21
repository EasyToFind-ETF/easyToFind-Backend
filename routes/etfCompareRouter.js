const express = require("express");
const etfCompareController = require("../controllers/etfCompareController");

const router = express.Router();

router.get("/:etf_code", etfCompareController.getEtfOneData);

module.exports = router;
