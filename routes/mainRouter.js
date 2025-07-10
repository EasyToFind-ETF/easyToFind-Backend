const express = require('express');
const { mainPage } = require("../controllers/mainController");

const router = express.Router();

router.get('/', mainPage);

module.exports = router;
