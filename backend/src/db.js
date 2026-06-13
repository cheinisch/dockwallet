import pg from "pg"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, "../db/migrations")

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

async function runMigrations(client) {
  // Migrations-Tabelle anlegen falls nicht vorhanden
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Bereits angewendete Versionen laden
  const applied = await client.query("SELECT version FROM schema_migrations")
  const appliedVersions = new Set(applied.rows.map((r) => r.version))

  // Alle Migration-Dateien sortiert laden
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  let ran = 0
  for (const file of files) {
    if (appliedVersions.has(file)) continue

    console.log(`Migration ausführen: ${file}`)
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")

    await client.query("BEGIN")
    try {
      await client.query(sql)
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [file]
      )
      await client.query("COMMIT")
      console.log(`✓ ${file} angewendet`)
      ran++
    } catch (err) {
      await client.query("ROLLBACK")
      console.error(`✗ ${file} fehlgeschlagen:`, err.message)
      throw err
    }
  }

  if (ran === 0) {
    console.log("Datenbank aktuell, keine Migrationen nötig.")
  } else {
    console.log(`${ran} Migration(en) erfolgreich angewendet.`)
  }
}

export async function initDb() {
  const client = await pool.connect()
  try {
    await runMigrations(client)
  } catch (err) {
    console.error("Startup fehlgeschlagen:", err)
    throw err
  } finally {
    client.release()
  }
}

export default pool
