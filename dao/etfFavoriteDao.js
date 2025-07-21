const insertFavorite = async (client, user_id, etf_code) => {
  const query = `
    INSERT INTO user_favorites (user_id, etf_code, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, etf_code) DO NOTHING
  `;
  await client.query(query, [user_id, etf_code]);
};

const deleteFavorite = async (client, user_id, etf_code) => {
  const query = `
    DELETE FROM user_favorites
    WHERE user_id = $1 AND etf_code = $2
  `;
  await client.query(query, [user_id, etf_code]);
};

module.exports = { insertFavorite, deleteFavorite };
