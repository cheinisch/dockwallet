import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { initDb } from "./db.js"
import authRouter from "./auth/router.js"
import adminRouter from "./admin/router.js"
import passesRouter from "./passes/router.js"

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3000

// Version aus package.json lesen
const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"))
const BACKEND_VERSION = pkg.version

app.use(cors())
app.use(express.json({ limit: "10mb" }))

app.use("/api/auth",   authRouter)
app.use("/api/admin",  adminRouter)
app.use("/api/passes", passesRouter)

// Health + Version
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: BACKEND_VERSION })
})

app.get("/api/version", (req, res) => {
  res.json({
    version:   BACKEND_VERSION,
    name:      pkg.name,
    nodeVersion: process.version,
    uptime:    Math.floor(process.uptime()),
  })
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend v${BACKEND_VERSION} läuft auf Port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("Startup fehlgeschlagen:", err)
    process.exit(1)
  })


// Docker Hub Version-Check (proxied um CORS zu umgehen)
app.get("/api/dockerhub/latest", async (req, res) => {
  try {
    const [backendRes, frontendRes] = await Promise.all([
      fetch("https://hub.docker.com/v2/repositories/cheinisch/dockwallet-backend/tags?page_size=10&ordering=last_updated"),
      fetch("https://hub.docker.com/v2/repositories/cheinisch/dockwallet-frontend/tags?page_size=10&ordering=last_updated"),
    ])

    const parseLatest = (data) => {
      const tags = (data.results || [])
        .map(t => t.name)
        .filter(n => /^v?\d+\.\d+/.test(n))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      return tags[0]?.replace(/^v/, "") || null
    }

    const backendData  = backendRes.ok  ? await backendRes.json()  : {}
    const frontendData = frontendRes.ok ? await frontendRes.json() : {}

    res.json({
      backend:  parseLatest(backendData),
      frontend: parseLatest(frontendData),
    })
  } catch (err) {
    res.status(503).json({ error: "Docker Hub nicht erreichbar", detail: err.message })
  }
})