const { Pool } = require("pg"); // ← 여기서 Pool 클래스를 불러옴
const {
  DB_HOST,
  DB_USER,
  DB_PORT,
  DB_PASSWORD,
  DB_NAME,
} = require("./envConstants");

const pool = new Pool({
  max: 30, // connectionLimit과 같은 역할
  host: DB_HOST,
  user: DB_USER,
  port: DB_PORT,
  password: DB_PASSWORD,
  database: DB_NAME,
});

module.exports = pool;
