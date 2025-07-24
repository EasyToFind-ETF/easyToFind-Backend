const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getMainTrendService } = require("../services/getMainTrendService");

const getMainTrendController = {
  getAum: async (req, res) => {
    try {
      const result = await getMainTrendService.getAumService();
      res.json(
        successResponse(
          responseMessage.success.read.status,
          responseMessage.success.read.message,
          result
        )
      );
    } catch (error) {
      res.json(failResponse(error));
      console.error(error);
    }
  },
  getFluc: async (req, res) => {
    try {
      const result = await getMainTrendService.getFlucService();
      res.json(
        successResponse(
          responseMessage.success.read.status,
          responseMessage.success.read.message,
          result
        )
      );
    } catch (error) {
      res.json(failResponse(error));
      console.error(error);
    }
  },
  getVolume: async (req, res) => {
    try {
        const result = await getMainTrendService.getVolumeService();
      res.json(
        successResponse(
          responseMessage.success.read.status,
          responseMessage.success.read.message,
          result
        )
      );
    } catch (error) {
      res.json(failResponse(error));
      console.error(error);
            }
  },    
};

module.exports = { getMainTrendController };