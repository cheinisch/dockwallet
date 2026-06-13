import { Router } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import pool from "../db.js"

const router = Router()

// GET /api/auth/config
router.get("/config", (req, res) => {
  res.json({ registrationEnabled: process.env.USER_REGISTRATION === "true" })
})

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username und Passwort erforderlich" })
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [username]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" })
    }

    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin } })
  } catch (err) {
    console.error("Login-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// POST /api/auth/register
router.post("/register", async (req, res) => {
  if (process.env.USER_REGISTRATION !== "true") {
    return res.status(403).json({ error: "Registrierung ist deaktiviert" })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "E-Mail und Passwort erforderlich" })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen lang sein" })
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email])

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "E-Mail bereits registriert" })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      "INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, false) RETURNING id, email, is_admin",
      [email, password_hash]
    )

    const user = result.rows[0]
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.status(201).json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin } })
  } catch (err) {
    console.error("Registrierungs-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const header = req.headers.authorization

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Nicht authentifiziert" })
  }

  try {
    const token = header.split(" ")[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const result = await pool.query(
      "SELECT id, email, is_admin, created_at FROM users WHERE id = $1",
      [payload.id]
    )

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User nicht gefunden" })
    }

    res.json(result.rows[0])
  } catch {
    res.status(401).json({ error: "Token ungültig" })
  }
})

export default router