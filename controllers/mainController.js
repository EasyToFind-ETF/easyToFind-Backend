const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getEtfs } = require("../services/mainService");

const board = {
  mainPage: async (req, res) => {
    const etfs = await getEtfs();

    res.json(
      successResponse(
        responseMessage.success.read.status,
        responseMessage.success.read.message,
        etfs
      )
    );
  },
};

module.exports = board;
