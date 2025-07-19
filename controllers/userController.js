const userService = require("../services/userService");
const { createToken, verifyToken } = require("../utils/auth");

const userController = {
  signup: async (req, res, next) => {
    try {
      const { user_email, password, birth } = req.body;
      const user = await userService.signUp(user_email, password, birth);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { user_email, password } = req.body;
      const user = await userService.login(user_email, password);

      const tokenMaxAge = 60 * 60 * 24 * 3;
      const token = createToken(user, tokenMaxAge);

      res.cookie("authToken", token, {
        httpOnly: true,
        maxAge: tokenMaxAge * 1000,
      });

      res.status(200).json({ ...user, token });
    } catch (err) {
      next(err);
    }
  },

  logout: (req, res) => {
    res.cookie("authToken", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    });
    res.status(204).send();
  },
};

module.exports = userController;
