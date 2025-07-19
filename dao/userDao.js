const bcrypt = require("bcrypt");

const userDao = {
  createUser: async (connection, email, hashedPassword, brith) => {
    const query = `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING id, email;
    `;
    const values = [email, hashedPassword];
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
};

module.exports = userDao;
