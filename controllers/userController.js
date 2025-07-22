const userService = require("../services/userService");
const { createToken, verifyToken } = require("../utils/auth");
const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");

const userController = {
  signup: async (req, res, next) => {
    try {
      const { user_email, password, birth, name } = req.body;
      console.log("📝 회원가입 요청 데이터:", {
        user_email,
        password,
        birth,
        name,
      });
      const user = await userService.signUp(user_email, password, birth, name);
      res.json(
        successResponse(
          responseMessage.success.create.status,
          responseMessage.success.create.message,
          user
        )
      );
    } catch (err) {
      res
        .status(400)
        .json(
          failResponse(
            responseMessage.fail.create.status,
            err.message || responseMessage.fail.create.message
          )
        );
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { user_email, password } = req.body;
      const user = await userService.login(user_email, password);

      const tokenMaxAge = 60 * 60 * 24 * 3;
      const token = createToken(user, tokenMaxAge);

      // ✅ 쿠키 먼저 설정
      res
        .cookie("authToken", token, {
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
          maxAge: tokenMaxAge * 1000,
        })
        .json({ token });

      // ✅ 그리고 바로 응답 (절대 next() 호출하거나 비동기 중간 끼지 말 것)
      res.status(200).json({
        user_id: user.user_id,
        user_email: user.user_email,
      });
    } catch (err) {
      next(err);
    }
  },

  logout: (req, res) => {
    res.cookie("authToken", "", {
      httpOnly: false,
      expires: new Date(Date.now()),
    });
    res.status(204).send();
  },
  getMe: async (req, res) => {
    try {
      const userId = req.user.user_id; // ✅ authMiddleware에서 세팅된 user
      const user = await userService.getUserInfoById(userId);

      res.json(
        successResponse(
          responseMessage.success.read.status,
          responseMessage.success.read.message,
          user
        )
      );
    } catch (error) {
      console.error(error);
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

module.exports = userController;
