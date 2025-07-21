const express = require("express");
const {
  saveTestResultPage,
} = require("../controllers/saveTestResultController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
router.put("/", authMiddleware, saveTestResultPage);

module.exports = router;
