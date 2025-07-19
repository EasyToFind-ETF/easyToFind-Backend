const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "your-secret";

const createToken = (user, expiresIn = 60 * 60 * 24 * 3) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      user_email: user.user_email,
    },
    SECRET,
    { expiresIn }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = { createToken, verifyToken };
