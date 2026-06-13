import { Router } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { authenticator } from "otplib"
import QRCode from "qrcode"
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server"
import pool from "../db.js"
import { requireAuth } from "./middleware.js"
import {
  sendVerificationMail,
  sendPasswordResetMail,
  sendDeleteAccountMail,
  sendMfaCodeMail,
  isSmtpConfigured,
} from "../mail.js"

const router = Router()
const TOKEN_TTL = 15 * 60 * 1000 // 15 Minuten in ms

function generateToken() {
  return crypto.randomBytes(32).toString("hex")
}

function expiresAt() {
  return new Date(Date.now() + TOKEN_TTL)
}

const rpName = "DockWallet"
const rpID = () => process.env.SERVER_HOST || "localhost"
const origin = () => `https://${rpID()}`

// ─── Config ───────────────────────────────────────────────────────────────────

router.get("/config", (req, res) => {
  res.json({ registrationEnabled: process.env.USER_REGISTRATION === "true" })
})

// ─── Register ─────────────────────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  if (process.env.USER_REGISTRATION !== "true") {
    return res.status(403).json({ error: "Registrierung ist deaktiviert" })
  }

  const { username, email, password } = req.body

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
      "INSERT INTO users (username, email, password_hash, is_admin, is_active) VALUES ($1, $2, $3, false, false) RETURNING id, username, email",
      [username, email, password_hash]
    )
    const user = result.rows[0]

    const token = generateToken()
    await pool.query(
      "INSERT INTO email_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt()]
    )
    await sendVerificationMail(email, token)

    res.status(201).json({ message: "Registrierung erfolgreich. Bitte E-Mail bestätigen." })
  } catch (err) {
    console.error("Registrierungs-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Verify Email ─────────────────────────────────────────────────────────────

router.get("/verify-email", async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: "Token fehlt" })

  try {
    const result = await pool.query(
      "SELECT * FROM email_tokens WHERE token = $1 AND expires_at > NOW()",
      [token]
    )
    if (!result.rows[0]) {
      return res.status(400).json({ error: "Token ungültig oder abgelaufen" })
    }

    const { user_id } = result.rows[0]
    await pool.query("UPDATE users SET is_active = true WHERE id = $1", [user_id])
    await pool.query("DELETE FROM email_tokens WHERE user_id = $1", [user_id])

    res.json({ message: "E-Mail bestätigt. Du kannst dich jetzt anmelden." })
  } catch (err) {
    console.error("Verify-Email-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Login ────────────────────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const { username, password, mfaToken } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username und Passwort erforderlich" })
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $1",
      [username]
    )
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: "Ungültige Anmeldedaten" })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: "Ungültige Anmeldedaten" })

    if (!user.is_active) {
      return res.status(403).json({ error: "Konto nicht aktiv. Bitte E-Mail bestätigen." })
    }

    if (user.mfa_enabled) {
      if (!mfaToken) {
        return res.status(200).json({ mfaRequired: true })
      }
      const secretResult = await pool.query(
        "SELECT secret FROM mfa_secrets WHERE user_id = $1",
        [user.id]
      )
      const secret = secretResult.rows[0]?.secret
      if (!secret || !authenticator.verify({ token: mfaToken, secret })) {
        return res.status(401).json({ error: "Ungültiger MFA-Code" })
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, is_admin: user.is_admin },
    })
  } catch (err) {
    console.error("Login-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Me ───────────────────────────────────────────────────────────────────────

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, first_name, last_name, email, is_admin, is_active, mfa_enabled, created_at FROM users WHERE id = $1",
      [req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: "User nicht gefunden" })
    res.json(result.rows[0])
  } catch {
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Profile Update ───────────────────────────────────────────────────────────

router.put("/profile", requireAuth, async (req, res) => {
  const { username, first_name, last_name, email } = req.body

  if (!username || !email) {
    return res.status(400).json({ error: "Benutzername und E-Mail erforderlich" })
  }

  try {
    const conflict = await pool.query(
      "SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3",
      [email, username, req.user.id]
    )
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: "E-Mail oder Benutzername bereits vergeben" })
    }

    const result = await pool.query(
      "UPDATE users SET username = $1, first_name = $2, last_name = $3, email = $4 WHERE id = $5 RETURNING id, username, first_name, last_name, email, is_admin, mfa_enabled",
      [username, first_name || null, last_name || null, email, req.user.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error("Profil-Update-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Forgot Password ──────────────────────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: "E-Mail erforderlich" })

  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email])
    if (!result.rows[0]) return res.json({ message: "Falls die E-Mail existiert, wurde eine Mail gesendet." })

    const user = result.rows[0]
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id])

    const token = generateToken()
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt()]
    )
    await sendPasswordResetMail(email, token)

    res.json({ message: "Falls die E-Mail existiert, wurde eine Mail gesendet." })
  } catch (err) {
    console.error("Forgot-Password-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Reset Password ───────────────────────────────────────────────────────────

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: "Token und Passwort erforderlich" })
  if (password.length < 8) return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen lang sein" })

  try {
    const result = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()",
      [token]
    )
    if (!result.rows[0]) return res.status(400).json({ error: "Token ungültig oder abgelaufen" })

    const { user_id } = result.rows[0]
    const password_hash = await bcrypt.hash(password, 12)
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, user_id])
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user_id])

    res.json({ message: "Passwort erfolgreich geändert." })
  } catch (err) {
    console.error("Reset-Password-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── MFA Setup ────────────────────────────────────────────────────────────────

router.post("/mfa/setup", requireAuth, async (req, res) => {
  try {
    const secret = authenticator.generateSecret()
    const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [req.user.id])
    const email = userResult.rows[0]?.email

    await pool.query(
      "INSERT INTO mfa_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET secret = $2",
      [req.user.id, secret]
    )

    const otpauth = authenticator.keyuri(email, "DockWallet", secret)
    const qrCode = await QRCode.toDataURL(otpauth)

    res.json({ secret, qrCode })
  } catch (err) {
    console.error("MFA-Setup-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.post("/mfa/enable", requireAuth, async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: "Token erforderlich" })

  try {
    const result = await pool.query(
      "SELECT secret FROM mfa_secrets WHERE user_id = $1",
      [req.user.id]
    )
    const secret = result.rows[0]?.secret
    if (!secret) return res.status(400).json({ error: "MFA nicht eingerichtet" })

    if (!authenticator.verify({ token, secret })) {
      return res.status(401).json({ error: "Ungültiger Code" })
    }

    await pool.query("UPDATE users SET mfa_enabled = true WHERE id = $1", [req.user.id])
    res.json({ message: "MFA aktiviert" })
  } catch (err) {
    console.error("MFA-Enable-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.post("/mfa/disable", requireAuth, async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: "Token erforderlich" })

  try {
    const result = await pool.query(
      "SELECT secret FROM mfa_secrets WHERE user_id = $1",
      [req.user.id]
    )
    const secret = result.rows[0]?.secret
    if (!secret) return res.status(400).json({ error: "MFA nicht eingerichtet" })

    if (!authenticator.verify({ token, secret })) {
      return res.status(401).json({ error: "Ungültiger Code" })
    }

    await pool.query("UPDATE users SET mfa_enabled = false WHERE id = $1", [req.user.id])
    await pool.query("DELETE FROM mfa_secrets WHERE user_id = $1", [req.user.id])
    res.json({ message: "MFA deaktiviert" })
  } catch (err) {
    console.error("MFA-Disable-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── MFA per Mail ─────────────────────────────────────────────────────────────

router.get("/mfa/smtp-status", requireAuth, (req, res) => {
  res.json({ smtpConfigured: isSmtpConfigured() })
})

router.post("/mfa/send-code", requireAuth, async (req, res) => {
  if (!isSmtpConfigured()) {
    return res.status(503).json({ error: "SMTP nicht konfiguriert" })
  }

  try {
    const secretResult = await pool.query(
      "SELECT secret FROM mfa_secrets WHERE user_id = $1",
      [req.user.id]
    )
    const secret = secretResult.rows[0]?.secret
    if (!secret) return res.status(400).json({ error: "MFA nicht eingerichtet" })

    const code = authenticator.generate(secret)

    const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [req.user.id])
    await sendMfaCodeMail(userResult.rows[0].email, code)

    res.json({ message: "Code gesendet" })
  } catch (err) {
    console.error("MFA send-code Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Passkeys (WebAuthn) ──────────────────────────────────────────────────────

const challengeStore = new Map()

router.post("/passkey/register/options", requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [req.user.id]
    )
    const user = userResult.rows[0]

    const existingResult = await pool.query(
      "SELECT credential_id FROM passkey_credentials WHERE user_id = $1",
      [req.user.id]
    )

    const options = await generateRegistrationOptions({
      rpName: rpName,
      rpID: rpID(),
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.username,
      excludeCredentials: existingResult.rows.map((r) => ({
        id: Buffer.from(r.credential_id, "base64url"),
        type: "public-key",
      })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    })

    challengeStore.set(req.user.id, options.challenge)
    res.json(options)
  } catch (err) {
    console.error("Passkey-Register-Options-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.post("/passkey/register/verify", requireAuth, async (req, res) => {
  const { credential, deviceName } = req.body
  const expectedChallenge = challengeStore.get(req.user.id)
  if (!expectedChallenge) return res.status(400).json({ error: "Challenge abgelaufen" })

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
    })

    if (!verification.verified) return res.status(400).json({ error: "Verifizierung fehlgeschlagen" })

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

    await pool.query(
      "INSERT INTO passkey_credentials (user_id, credential_id, public_key, counter, device_name) VALUES ($1, $2, $3, $4, $5)",
      [
        req.user.id,
        Buffer.from(credentialID).toString("base64url"),
        Buffer.from(credentialPublicKey).toString("base64url"),
        counter,
        deviceName || "Unbekanntes Gerät",
      ]
    )

    challengeStore.delete(req.user.id)
    res.json({ message: "Passkey registriert" })
  } catch (err) {
    console.error("Passkey-Register-Verify-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.post("/passkey/login/options", async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: rpID(),
      userVerification: "preferred",
    })
    challengeStore.set("login_" + req.ip, options.challenge)
    res.json(options)
  } catch (err) {
    console.error("Passkey-Login-Options-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.post("/passkey/login/verify", async (req, res) => {
  const { credential } = req.body
  const expectedChallenge = challengeStore.get("login_" + req.ip)
  if (!expectedChallenge) return res.status(400).json({ error: "Challenge abgelaufen" })

  try {
    const credentialIdB64 = credential.id
    const credResult = await pool.query(
      "SELECT * FROM passkey_credentials WHERE credential_id = $1",
      [credentialIdB64]
    )
    const cred = credResult.rows[0]
    if (!cred) return res.status(400).json({ error: "Passkey nicht gefunden" })

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      authenticator: {
        credentialID: Buffer.from(cred.credential_id, "base64url"),
        credentialPublicKey: Buffer.from(cred.public_key, "base64url"),
        counter: cred.counter,
      },
    })

    if (!verification.verified) return res.status(400).json({ error: "Verifizierung fehlgeschlagen" })

    await pool.query(
      "UPDATE passkey_credentials SET counter = $1 WHERE id = $2",
      [verification.authenticationInfo.newCounter, cred.id]
    )

    const userResult = await pool.query(
      "SELECT id, username, email, is_admin FROM users WHERE id = $1",
      [cred.user_id]
    )
    const user = userResult.rows[0]

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    challengeStore.delete("login_" + req.ip)
    res.json({ token, user })
  } catch (err) {
    console.error("Passkey-Login-Verify-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.get("/passkeys", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, device_name, created_at FROM passkey_credentials WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.delete("/passkeys/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM passkey_credentials WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    )
    res.json({ message: "Passkey gelöscht" })
  } catch {
    res.status(500).json({ error: "Serverfehler" })
  }
})

// ─── Delete Account ───────────────────────────────────────────────────────────

router.post("/delete-account/request", requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT email, is_admin FROM users WHERE id = $1",
      [req.user.id]
    )
    const user = userResult.rows[0]
    if (!user) return res.status(404).json({ error: "User nicht gefunden" })
    if (user.is_admin) return res.status(403).json({ error: "Admins können ihr Konto nicht löschen" })

    await pool.query("DELETE FROM delete_account_tokens WHERE user_id = $1", [req.user.id])

    const token = generateToken()
    await pool.query(
      "INSERT INTO delete_account_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [req.user.id, token, expiresAt()]
    )
    await sendDeleteAccountMail(user.email, token)

    res.json({ message: "Bestätigungs-Mail wurde gesendet." })
  } catch (err) {
    console.error("Delete-Account-Request-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

router.get("/delete-account/confirm", async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: "Token fehlt" })

  try {
    const result = await pool.query(
      "SELECT * FROM delete_account_tokens WHERE token = $1 AND expires_at > NOW()",
      [token]
    )
    if (!result.rows[0]) return res.status(400).json({ error: "Token ungültig oder abgelaufen" })

    const { user_id } = result.rows[0]
    await pool.query("DELETE FROM users WHERE id = $1", [user_id])

    res.json({ message: "Konto wurde gelöscht." })
  } catch (err) {
    console.error("Delete-Account-Confirm-Fehler:", err)
    res.status(500).json({ error: "Serverfehler" })
  }
})

export default router