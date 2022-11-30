import mysql from 'mysql2/promise'

export const boxDb = mysql.createPool({
  host: process.env.BOX_DB_HOST,
  user: process.env.BOX_DB_USER,
  password: process.env.BOX_DB_PASSWORD,
  database: process.env.BOX_DB_DATABASE
})

export const migrationDb = mysql.createPool({
  host: process.env.MIGRATION_DB_HOST,
  user: process.env.MIGRATION_DB_USER,
  password: process.env.MIGRATION_DB_PASSWORD,
  database: process.env.MIGRATION_DB_DATABASE
})
