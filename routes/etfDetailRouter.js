const express = require("express");
const router = express.Router();
const etfDetailController = require("../controllers/etfDetailController");

// ETF 상세 정보 조회
router.get("/:etf_code", etfDetailController.getEtfDetail);

module.exports = router;

