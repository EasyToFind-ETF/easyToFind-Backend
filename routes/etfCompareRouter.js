const express = require("express");
const etfCompareController = require("../controllers/etfCompareController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:etf_code", authMiddleware, etfCompareController.getEtfOneData);

module.exports = router;
