import { Router } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import pool from "../db.js"

const router = Router()

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
      {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
      },
    })
  } catch (err) {
    console.error("Login-Fehler:", err)
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