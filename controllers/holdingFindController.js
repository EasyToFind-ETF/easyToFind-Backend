const { response } = require("express");
const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getHoldingFindService } = require("../services/holdingFindService");

const holdingFindController = {
  getHoldingFindPage: async (req, res) => {
    const { query, sort, assetClass, theme, isFavorite } = req.query;

    try {
      const result = await getHoldingFindService(
        query,
        sort,
        assetClass,
        theme,
        isFavorite
      );

      res.json(
        successResponse(
          responseMessage.success.read.status,
          responseMessage.success.read.message,
          result
        )
      );
    } catch (error) {
      console.log("Holding 검색 실패: ", error);
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

module.exports = holdingFindController;
