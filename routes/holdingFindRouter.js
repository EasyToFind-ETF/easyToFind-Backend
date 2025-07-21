const express = require("express");
const { getHoldingFindPage } = require("../controllers/holdingFindController");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.get("/", (req, res, next) => {
  const isFavorite = req.query.isFavorite;

  if (isFavorite === "true") {
    verifyToken(req, res, () => getHoldingFindPage(req, res));
  } else {
    getHoldingFindPage(req, res);
  }
});

module.exports = router;
