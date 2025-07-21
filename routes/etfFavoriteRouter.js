const express = require("express");
const etfFavoriteController = require("../controllers/etfFavoriteController");
const verifyToken = require("../middlewares/verifyToken"); // ← JWT 디코딩 미들웨어

const router = express.Router();

router.get("/favorites", verifyToken, etfFavoriteController.getFavorites);

router.post("/favorites/:etf_code", verifyToken, etfFavoriteController.add);

router.delete(
  "/favorites/:etf_code",
  verifyToken,
  etfFavoriteController.remove
);

module.exports = router;
