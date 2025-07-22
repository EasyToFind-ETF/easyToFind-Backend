const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getTRService } = require("../services/getTestResultService");

const getTestResultController = {
  getTestResultPage: async (req, res) => {
    const { stabilityScore, liquidityScore, growthScore, divScore } = req.body;
    console.log("reqcontroller", req.body);

    try {
      const result = await getTRService(
        stabilityScore,
        liquidityScore,
        growthScore,
        divScore
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
