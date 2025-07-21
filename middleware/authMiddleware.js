const { verifyToken } = require("../utils/auth");

const authMiddleware = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (decoded) {
    req.user = decoded;
  } else {
    req.user = null;
  }

  next();
};

module.exports = authMiddleware;
