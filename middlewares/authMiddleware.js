// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  const token = req.cookies.authToken; // ✅ 쿠키에서 꺼냄
  console.log("🍪 accessToken in cookie:", token); // ✅ 이거 찍어보세요

  if (!token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // user_id, user_email 등 사용 가능
    next();
  } catch (error) {
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
};

module.exports = authMiddleware;
