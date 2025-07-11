const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { saveTRService } = require("../services/saveTestResultService");

const saveTestResultController = {
  saveTestResultPage: async (req, res) => {
    const { userId, mbtiType } = req.body;

    try {
      const result = await saveTRService(userId, mbtiType);
      console.log("Test result saved successfully:", result);
      console.log("User ID:", userId);
      console.log("MBTI Type:", mbtiType);
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

module.exports = saveTestResultController;
