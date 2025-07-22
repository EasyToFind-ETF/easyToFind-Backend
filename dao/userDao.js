const bcrypt = require("bcrypt");

const userDao = {
  createUser: async (connection, email, hashedPassword, brith, name) => {
    const query = `
      INSERT INTO users (email, password,brith,name)
      VALUES ($1, $2,$3,$4)
      RETURNING id, email;
    `;
    const values = [email, hashedPassword, brith, name];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  findUserByEmail: async (connection, email) => {
    const query = `
      SELECT id, email, password
      FROM users
      WHERE email = $1;
    `;
    const result = await db.query(query, [email]);
    return result.rows[0]; // null 가능성 있음
  },

  getUserById: async (userId) => {
    return await User.findByPk(userId, {
      attributes: ["user_id", "user_email", "birth", "created_at"],
    });
  },
};

module.exports = userDao;
