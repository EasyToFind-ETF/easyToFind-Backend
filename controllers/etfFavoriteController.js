const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");

const {
  addFavorite,
  removeFavorite,
  getFavoritesByUserId,
} = require("../services/etfFavoriteService");

const etfFavoriteController = {
  add: async (req, res) => {
    try {
      const { etf_code } = req.params;
      const user_id = req.user?.user_id;

      // console.log("📥 [POST 관심 ETF] etf_code:", etf_code);
      // console.log("🙋 [POST 관심 ETF] user_id:", user_id);

      if (!user_id)
        return res.status(401).json(failResponse(401, "로그인이 필요합니다!"));

      await addFavorite(user_id, etf_code);

      // console.log("✅ 관심 ETF 추가 성공");
      res.json(successResponse(200, "관심 ETF 추가 완료! 🎉"));
    } catch (err) {
      // console.error("❌ 관심 ETF 추가 실패:", err);
      res.status(500).json(failResponse(500, "관심 ETF 추가 실패"));
    }
  },

  remove: async (req, res) => {
    try {
      const { etf_code } = req.params;
      const user_id = req.user?.user_id;

      if (!user_id)
        return res.status(401).json(failResponse(401, "로그인이 필요합니다!"));

      await removeFavorite(user_id, etf_code);

      res.json(successResponse(200, "관심 ETF 삭제 완료! 🧹"));
    } catch (err) {
      // console.error(err);
      res.status(500).json(failResponse(500, "관심 ETF 삭제 실패"));
    }
  },

  getFavorites: async (req, res) => {
    try {
      // console.log("🧑‍💻 req.user 내용:", req.user);

      const user_id = req.user?.user_id;
      if (!user_id) {
        // console.error("❌ user_id 없음! 인증 실패 또는 토큰 파싱 실패");
        return res.status(401).json(failResponse(401, "로그인이 필요해요"));
      }
      // console.log(`🔍 user_id = ${user_id} 에 대한 관심 ETF 목록 조회 시작`);

      const favorites = await getFavoritesByUserId(user_id);

      // console.log("✅ 조회된 관심 ETF:", favorites);

      res.json(successResponse(200, "관심 ETF 목록 조회 성공", favorites));
    } catch (err) {
      // console.error(err);
      res.status(500).json(failResponse(500, "관심 ETF 목록 조회 실패"));
    }
  },
};

module.exports = etfFavoriteController;
