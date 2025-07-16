const saveTestResultDao = {
  saveTRDao: async (connection, userId, mbtiType) => {
    //sql injection 방지를 위해 파라미터화된 쿼리 사용한것임(ex: $1, $2)
    //$1, $2 순서와 [mbtiType, userId] 배열의 순서가 일치해야 함
    const query = `UPDATE users SET mbti_type = $1 WHERE user_id = $2`;
    const result = await connection.query(query, [mbtiType, userId]);

    return result.rows;
  },
};
module.exports = saveTestResultDao;
