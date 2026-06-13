import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { initDb } from "./db.js"
import authRouter from "./auth/router.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRouter)

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend läuft auf Port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("Startup fehlgeschlagen:", err)
    process.exit(1)
  })