const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { saveTRService } = require("../services/saveTestResultService");

const saveTestResultController = {
  saveTestResultPage: async (req, res) => {
    const userId = req.user.user_id; // authMiddleware에서 넣어준 값
    const {
      mbtiType,
      stabilityWeight,
      liquidityWeight,
      growthWeight,
      divWeight,
    } = req.body;
    console.log("userId", userId);

    try {
      const result = await saveTRService(
        userId,
        mbtiType,
        stabilityWeight,
        liquidityWeight,
        growthWeight,
        divWeight
      );
      //   console.log("User ID:", userId);
      //   console.log("MBTI Type:", mbtiType);
      res.json(
        successResponse(
          //수정 api 라서 modify라고 뒀습니다, responseMessage 파일 안에 맞는 걸로 넣으면 됨
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
