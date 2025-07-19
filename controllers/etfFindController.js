const { response } = require("express");
const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getEtfFindService } = require("../services/etfFindService");

const etfFindController = {
  getEtfFindPage: async (req, res) => {
    // console.log("✅ [Controller] etfFindController 도착!");

    const { query, sort, assetClass, theme, isFavorite } = req.query;

    try {
      const result = await getEtfFindService(
        query,
        sort,
        assetClass,
        theme,
        isFavorite
      );

      // console.log("🎯 [Controller] 서비스 결과:", result);

      res.json(
        successResponse(
          responseMessage.success.read.status,
          responseMessage.success.read.message,
          result
        )
      );
    } catch (error) {
      console.log("ETF 검색 실패: ", error);
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

module.exports = etfFindController;
