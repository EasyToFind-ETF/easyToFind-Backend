const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getTTRService } = require("../services/getTestThemeResultService");

const getTestThemeResultController = {
  getTestThemeResultPage: async (req, res) => {
    const { stabilityScore, liquidityScore, growthScore, divScore, theme } =
      req.body;
    console.log("req", req.body);

    try {
      const result = await getTTRService(
        stabilityScore,
        liquidityScore,
        growthScore,
        divScore,
        theme
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

module.exports = getTestThemeResultController;
