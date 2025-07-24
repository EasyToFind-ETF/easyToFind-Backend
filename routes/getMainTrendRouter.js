const express = require("express");
const router = express.Router();
const { getMainTrendController } = require("../controllers/getMainTrendController");

router.get("/aum", getMainTrendController.getAum);
router.get("/fluc", getMainTrendController.getFluc);
router.get("/volume", getMainTrendController.getVolume);

module.exports = router;
