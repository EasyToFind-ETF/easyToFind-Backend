const express = require("express");
const {
  saveTestResultPage,
} = require("../controllers/saveTestResultController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.put("/", authMiddleware, saveTestResultPage);

module.exports = router;
