const getUserRiskProfileDao = async (ConnectionAcquireTimeoutError, userId) => {
  const sql = `
    SELECT risk_score
    FROM users
    WHERE user_id = $1
    `;

  const { rows } = await connection.query(sql, [userId]);

  if (rows.length === 0) {
    return null;
  }

  return rows[0].risk_score;
};

module.exports = { getUserRiskProfileDao };
