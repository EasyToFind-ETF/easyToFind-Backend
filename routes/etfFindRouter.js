const express = require("express");
const { getEtfFindPage } = require("../controllers/etfFindController");

const router = express.Router();

router.get("/", (req, res) => {
  // console.log("✅ [Router] etfFind 요청 도착했나?");
  getEtfFindPage(req, res);
});

module.exports = router;
