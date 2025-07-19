const {
  getTestThemeResultPage,
} = require("../controllers/getTestThemeController");
const express = require("express");

const router = express.Router();

router.post("/", getTestThemeResultPage);

module.exports = router;
