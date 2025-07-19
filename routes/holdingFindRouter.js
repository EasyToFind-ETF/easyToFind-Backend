const express = require("express");
const { getHoldingFindPage } = require("../controllers/holdingFindController");

const router = express.Router();

router.get("/", (req, res) => {
  getHoldingFindPage(req, res);
});

module.exports = router;
