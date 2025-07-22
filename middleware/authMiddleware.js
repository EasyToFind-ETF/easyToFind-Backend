// middlewares/authMiddleware.js
const { verifyToken } = require("../utils/auth");

const authMiddleware = (req, res, next) => {
  const token = req.cookies.authToken;
  console.log("🍪 accessToken in cookie:", token);

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (decoded) {
    req.user = decoded;
  } else {
    req.user = null;
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }

  next();
};

module.exports = authMiddleware;
