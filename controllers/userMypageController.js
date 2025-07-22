const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getUserInfoById } = require("../services/userMypageService");

const userMypageController = {
  getUserInfo: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json(failResponse(401, "로그인이 필요합니다!"));
      }

      const userInfo = await getUserInfoById(user_id);
      if (!userInfo) {
        return res
          .status(404)
          .json(failResponse(404, "유저 정보를 찾을 수 없습니다."));
      }

      res.json(successResponse(200, "마이페이지 정보 조회 성공", userInfo));
    } catch (err) {
      console.error("❌ 마이페이지 정보 조회 실패:", err);
      res.status(500).json(failResponse(500, "마이페이지 정보 조회 실패"));
    }
  },
};

module.exports = userMypageController;
