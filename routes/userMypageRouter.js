const express = require("express");
const router = express.Router();
const userMypageController = require("../controllers/userMypageController");
const verifyToken = require("../middleware/verifyToken");

router.get("/", verifyToken, userMypageController.getUserInfo);

module.exports = router;
