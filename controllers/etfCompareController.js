const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getEtfOneService } = require("../services/etfCompareService");

const etfCompareController = {
  getEtfOneData: async (req, res) => {
    const { etf_code } = req.params;

    try {
      const result = await getEtfOneService(etf_code);

      if (!result) {
        return res
          .status(404)
          .json(
            failResponse(
              404,
              `ETF 코드 '${etf_code}'에 해당하는 데이터가 없어요 😢`
            )
          );
      }

      res.json(
        successResponse(
          responseMessage.success.read.status,
          responseMessage.success.read.message,
          result
        )
      );
    } catch (error) {
      console.error("❌ ETF 단일 데이터 조회 실패:", error);
      res
        .status(500)
        .json(
          failResponse(
            responseMessage.fail.read.status,
            responseMessage.fail.read.message
          )
        );
    }
  },
};

module.exports = etfCompareController;
