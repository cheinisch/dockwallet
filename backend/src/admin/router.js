import { Router } from "express"
import bcrypt from "bcryptjs"
import pool from "../db.js"
import { requireAuth, requireAdmin } from "../auth/middleware.js"

const router = Router()
router.use(requireAuth, requireAdmin)

// ─── Alle User abrufen ────────────────────────────────────────────────────────

router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        u.id, u.username, u.first_name, u.last_name, u.email,
        u.is_admin, u.is_active, u.mfa_enabled, u.created_at,
        COUNT(DISTINCT p.id) AS pass_count,
        COUNT(DISTINCT pk.id) AS passkey_count,
        EXISTS(SELECT 1 FROM mfa_secrets ms WHERE ms.user_id = u.id) AS has_mfa_secret
       FROM users u
       LEFT JOIN passes p ON p.user_id = u.id
       LEFT JOIN passkey_credentials pk ON pk.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error("Admin users error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Einzelnen User abrufen ───────────────────────────────────────────────────

router.get("/users/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, first_name, last_name, email, is_admin, is_active, mfa_enabled, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: "User nicht gefunden" })
    res.json(result.rows[0])
  } catch (err) {
    console.error("Admin get user error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── User anlegen ─────────────────────────────────────────────────────────────

router.post("/users", async (req, res) => {
  const { username, first_name, last_name, email, password, is_admin, is_active } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Benutzername, E-Mail und Passwort erforderlich" })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen lang sein" })
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "E-Mail oder Benutzername bereits vergeben" })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      `INSERT INTO users (username, first_name, last_name, email, password_hash, is_admin, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, first_name, last_name, email, is_admin, is_active, created_at`,
      [username, first_name || null, last_name || null, email, password_hash, !!is_admin, is_active !== false]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Admin create user error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── User bearbeiten ──────────────────────────────────────────────────────────

router.put("/users/:id", async (req, res) => {
  const { username, first_name, last_name, email, is_admin, is_active } = req.body

  if (!username || !email) {
    return res.status(400).json({ error: "Benutzername und E-Mail erforderlich" })
  }

  try {
    const conflict = await pool.query(
      "SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3",
      [email, username, req.params.id]
    )
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: "E-Mail oder Benutzername bereits vergeben" })
    }

    const result = await pool.query(
      `UPDATE users
       SET username = $1, first_name = $2, last_name = $3, email = $4, is_admin = $5, is_active = $6
       WHERE id = $7
       RETURNING id, username, first_name, last_name, email, is_admin, is_active, mfa_enabled`,
      [username, first_name || null, last_name || null, email, !!is_admin, !!is_active, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: "User nicht gefunden" })
    res.json(result.rows[0])
  } catch (err) {
    console.error("Admin update user error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Passwort zurücksetzen ────────────────────────────────────────────────────

router.post("/users/:id/reset-password", async (req, res) => {
  const { password } = req.body
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen lang sein" })
  }

  try {
    const password_hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id",
      [password_hash, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: "User nicht gefunden" })
    res.json({ message: "Passwort zurückgesetzt" })
  } catch (err) {
    console.error("Admin reset password error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── MFA zurücksetzen ─────────────────────────────────────────────────────────

router.post("/users/:id/reset-mfa", async (req, res) => {
  try {
    await pool.query("DELETE FROM mfa_secrets WHERE user_id = $1", [req.params.id])
    await pool.query("UPDATE users SET mfa_enabled = false WHERE id = $1", [req.params.id])
    res.json({ message: "MFA zurückgesetzt" })
  } catch (err) {
    console.error("Admin reset MFA error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Passkeys zurücksetzen ────────────────────────────────────────────────────

router.delete("/users/:id/passkeys", async (req, res) => {
  try {
    await pool.query("DELETE FROM passkey_credentials WHERE user_id = $1", [req.params.id])
    res.json({ message: "Alle Passkeys gelöscht" })
  } catch (err) {
    console.error("Admin delete passkeys error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── User löschen (inkl. Passes) ──────────────────────────────────────────────

router.delete("/users/:id", async (req, res) => {
  // Eigenen Account kann man nicht löschen
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "Eigenen Account nicht löschbar" })
  }

  try {
    // Passes werden via ON DELETE CASCADE automatisch gelöscht
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: "User nicht gefunden" })
    res.json({ message: "User gelöscht" })
  } catch (err) {
    console.error("Admin delete user error:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

export default router
