const getUserInfoFromDB = async (client, user_id) => {
  const query = `
    SELECT name, mbti_type
    FROM users
    WHERE user_id = $1
  `;
  const result = await client.query(query, [user_id]);
  return result.rows[0];
};

module.exports = { getUserInfoFromDB };
