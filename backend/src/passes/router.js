import express from "express"
import { requireAuth } from "../auth/middleware.js"
import { parsePkpass, getPassesByUser, createPass, deletePass } from "./model.js"

const router = express.Router()

// Alle Pässe des eingeloggten Users
router.get("/", requireAuth, async (req, res) => {
  try {
    const passes = await getPassesByUser(req.user.id)
    res.json(passes)
  } catch (err) {
    console.error("GET /passes:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

// .pkpass-Datei hochladen (base64 encoded)
router.post("/upload", requireAuth, async (req, res) => {
  try {
    const { file } = req.body // base64-String
    if (!file) return res.status(400).json({ error: "Keine Datei übermittelt" })

    const buffer = Buffer.from(file, "base64")
    const parsed = parsePkpass(buffer)
    const pass = await createPass(req.user.id, parsed)

    res.status(201).json(pass)
  } catch (err) {
    console.error("POST /passes/upload:", err)
    res.status(400).json({ error: err.message })
  }
})

// Pass per URL importieren (z.B. aus QR-Code gescannt)
router.post("/import-url", requireAuth, async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: "Keine URL angegeben" })

    // URL validieren
    let parsedUrl
    try {
      parsedUrl = new URL(url)
    } catch {
      return res.status(400).json({ error: "Ungültige URL" })
    }

    // .pkpass herunterladen
    const fetchRes = await fetch(parsedUrl.toString())
    if (!fetchRes.ok) {
      return res.status(400).json({ error: "Datei konnte nicht heruntergeladen werden" })
    }

    const contentType = fetchRes.headers.get("content-type") || ""
    const arrayBuffer = await fetchRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const parsed = parsePkpass(buffer)
    const pass = await createPass(req.user.id, parsed)

    res.status(201).json(pass)
  } catch (err) {
    console.error("POST /passes/import-url:", err)
    res.status(400).json({ error: err.message })
  }
})

// Pass manuell anlegen (ohne Datei)
router.post("/", requireAuth, async (req, res) => {
  try {
    const pass = await createPass(req.user.id, req.body)
    res.status(201).json(pass)
  } catch (err) {
    console.error("POST /passes:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

// Pass löschen
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deletePass(req.user.id, req.params.id)
    if (!deleted) return res.status(404).json({ error: "Pass nicht gefunden" })
    res.json({ success: true })
  } catch (err) {
    console.error("DELETE /passes/:id:", err)
    res.status(500).json({ error: "Interner Fehler" })
  }
})

export default router