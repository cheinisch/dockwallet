import express from "express"
import crypto from "crypto"
import pool from "../db.js"
import { requireAuth } from "../auth/middleware.js"
import {
  parsePkpass,
  getPassesByUser,
  createPass,
  deletePass,
  setFavorite,
} from "../passes/model.js"

const router = express.Router()
const query = (text, params) => pool.query(text, params)

async function upsertSyncToken(userId, deviceName) {
  const token = crypto.randomBytes(32).toString("hex")
  const result = await query(
    `INSERT INTO sync_tokens (user_id, token, device_name)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING token`,
    [userId, token, deviceName || "Unbekanntes Geraet"]
  )
  return result.rows[0]?.token || token
}

router.post("/register-device", requireAuth, async (req, res) => {
  try {
    const { device_name } = req.body
    const token = await upsertSyncToken(req.user.id, device_name)
    res.json({ sync_token: token })
  } catch (err) {
    console.error("POST /sync/register-device:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

router.get("/devices", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, device_name, last_sync, created_at
       FROM sync_tokens WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error("GET /sync/devices:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

router.delete("/devices/:id", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM sync_tokens WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: "Geraet nicht gefunden" })
    res.json({ success: true })
  } catch (err) {
    console.error("DELETE /sync/devices/:id:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

router.get("/passes", requireAuth, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : null

    let passes
    if (since && !isNaN(since)) {
      const result = await query(
        `SELECT id, airline, flight_number, origin, destination,
                departure_time, arrival_time, event_date, passenger_name,
                seat, booking_reference, barcode,
                color_background, color_foreground, color_label, logo_text,
                signature_valid, signature_reason,
                is_voided, expiration_date, subtitle,
                is_favorite,
                raw_data, created_at, updated_at
         FROM passes WHERE user_id = $1 AND updated_at > $2
         ORDER BY is_favorite DESC, updated_at DESC`,
        [req.user.id, since]
      )
      passes = result.rows
    } else {
      passes = await getPassesByUser(req.user.id)
    }

    await query(
      `UPDATE sync_tokens SET last_sync = NOW() WHERE user_id = $1`,
      [req.user.id]
    ).catch(() => {})

    res.json({
      passes,
      server_time: new Date().toISOString(),
      count: passes.length,
    })
  } catch (err) {
    console.error("GET /sync/passes:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

router.post("/passes", requireAuth, async (req, res) => {
  try {
    const { file, pass_data } = req.body

    let parsed
    if (file) {
      const buffer = Buffer.from(file, "base64")
      parsed = parsePkpass(buffer)
    } else if (pass_data) {
      parsed = pass_data
    } else {
      return res.status(400).json({ error: "Kein Pass-Inhalt uebermittelt" })
    }

    const created = await createPass(req.user.id, parsed)
    res.status(201).json(created)
  } catch (err) {
    console.error("POST /sync/passes:", err)
    res.status(400).json({ error: err.message })
  }
})

router.delete("/passes/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deletePass(req.user.id, req.params.id)
    if (!deleted) return res.status(404).json({ error: "Pass nicht gefunden" })
    res.json({ success: true })
  } catch (err) {
    console.error("DELETE /sync/passes/:id:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

// Favorit setzen / entfernen (für App-Sync)
router.patch("/passes/:id/favorite", requireAuth, async (req, res) => {
  try {
    const { is_favorite } = req.body
    if (typeof is_favorite !== "boolean") {
      return res.status(400).json({ error: "is_favorite muss ein Boolean sein" })
    }
    const updated = await setFavorite(req.user.id, req.params.id, is_favorite)
    if (!updated) return res.status(404).json({ error: "Pass nicht gefunden" })
    res.json({ success: true, is_favorite: updated.is_favorite })
  } catch (err) {
    console.error("PATCH /sync/passes/:id/favorite:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

router.get("/status", requireAuth, async (req, res) => {
  try {
    const [passCount, devices] = await Promise.all([
      query(`SELECT COUNT(*) FROM passes WHERE user_id = $1`, [req.user.id]),
      query(`SELECT id, device_name, last_sync FROM sync_tokens WHERE user_id = $1`, [req.user.id]),
    ])
    res.json({
      pass_count:  parseInt(passCount.rows[0].count),
      devices:     devices.rows,
      server_time: new Date().toISOString(),
    })
  } catch (err) {
    console.error("GET /sync/status:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

export default router