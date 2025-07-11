const express = require("express");
const {
  saveTestResultPage,
} = require("../controllers/saveTestResultController");

const router = express.Router();
router.put("/", saveTestResultPage);

module.exports = router;
