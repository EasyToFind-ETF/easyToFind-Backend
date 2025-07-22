const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken;
  const secret = process.env.JWT_SECRET;

  // console.log("🍪 받은 쿠키:", req.cookies);
  // console.log("🪙 받은 토큰:", token);

  if (!token) {
    // console.log("🚫 토큰 없음");
    return res.status(401).json({ message: "로그인이 필요합니다!" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    // console.log("🆗 토큰 디코딩 결과:", decoded);
    req.user = decoded; // 이후 req.user.user_id 등으로 접근 가능
    next();
  } catch (err) {
    // console.log("❌ 토큰 검증 실패:", err);
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
};

module.exports = verifyToken;
