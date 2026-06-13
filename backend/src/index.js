import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import authRouter from "./auth/router.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Routes
app.use("/api/auth", authRouter)

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`)
})