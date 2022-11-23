import mysql from 'mysql2'

const connectionPool = mysql.createPool({
  host: process.env.BOX_DB_HOST,
  user: process.env.BOX_DB_USER,
  password: process.env.BOX_DB_PASSWORD,
  database: process.env.BOX_DB_DATABASE
})

export default connectionPool
