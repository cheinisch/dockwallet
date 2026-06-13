import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "dockwallet",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

pool.on("error", (err) => {
  console.error("Datenbankfehler:", err)
})

export default pool