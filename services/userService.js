const bcrypt = require("bcrypt");
const User = require("../models/Users");

const userService = {
  signUp: async (user_email, password, birth) => {
    const existing = await User.findOne({ where: { user_email } });
    if (existing) throw new Error("이미 존재하는 이메일입니다.");

    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      user_email,
      password: hashed,
      birth,
    });

    return {
      user_id: newUser.user_id,
      user_email: newUser.user_email,
      birth: newUser.birth,
    };
  },

  login: async (user_email, password) => {
    const user = await User.findOne({ where: { user_email } });
    if (!user) throw new Error("이메일이 존재하지 않습니다.");

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("비밀번호가 틀렸습니다.");

    return {
      user_id: user.user_id,
      user_email: user.user_email,
    };
  },
  getUserInfoById: async (userId) => {
    const user = await userDao.getUserById(userId);
    if (!user) {
      throw new Error("해당 사용자를 찾을 수 없습니다.");
    }
    return user;
  },
};

module.exports = userService;
