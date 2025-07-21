const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getTRService } = require("../services/getTestResultService");

const getTestResultController = {
  getTestResultPage: async (req, res) => {
    const { returnRate, liquidity, trackingError, aum } = req.body;
    console.log("req", req.body);

    try {
      const result = await getTRService(
        returnRate,
        liquidity,
        trackingError,
        aum
      );
      res.json(
        successResponse(
          responseMessage.success.modify.status,
          responseMessage.success.modify.message,
          result
        )
      );
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json(
          failResponse(
            responseMessage.fail.modify.status,
            responseMessage.fail.modify.message
          )
        );
    }
  },
};

module.exports = getTestResultController;
