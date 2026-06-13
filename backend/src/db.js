import pg from "pg"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

export async function initDb() {
  const client = await pool.connect()
  try {
    const check = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      ) AS exists
    `)

    if (check.rows[0].exists) {
      console.log("Datenbank bereits initialisiert.")
      return
    }

    console.log("Datenbank leer, starte Initialisierung...")
    const sql = fs.readFileSync(path.join(__dirname, "../db/init.sql"), "utf8")
    await client.query(sql)
    console.log("Datenbank erfolgreich initialisiert.")
  } catch (err) {
    console.error("Fehler bei DB-Initialisierung:", err)
    throw err
  } finally {
    client.release()
  }
}

export default pool