const express = require("express");
const { getEtfFindPage } = require("../controllers/etfFindController");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.get("/", (req, res, next) => {
  console.log("🚏 [Router] /api/etfs 요청 도착");

  const isFavorite = req.query.isFavorite;

  if (isFavorite === "true") {
    verifyToken(req, res, () => getEtfFindPage(req, res));
  } else {
    getEtfFindPage(req, res);
  }
});

module.exports = router;
