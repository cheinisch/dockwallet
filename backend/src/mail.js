import nodemailer from "nodemailer"

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: parseInt(process.env.SMTP_PORT || "587") === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const from = () => process.env.SMTP_FROM || "DockWallet <noreply@dockwallet.app>"
const baseUrl = () => `https://${process.env.SERVER_HOST || "localhost"}`

export async function sendVerificationMail(email, token) {
  const link = `${baseUrl()}/verify-email?token=${token}`
  await createTransport().sendMail({
    from: from(),
    to: email,
    subject: "DockWallet – E-Mail bestätigen",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Willkommen bei DockWallet</h2>
        <p>Bitte bestätige deine E-Mail-Adresse:</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          E-Mail bestätigen
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">
          Der Link ist 15 Minuten gültig. Falls du dich nicht registriert hast, kannst du diese Mail ignorieren.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetMail(email, token) {
  const link = `${baseUrl()}/reset-password?token=${token}`
  await createTransport().sendMail({
    from: from(),
    to: email,
    subject: "DockWallet – Passwort zurücksetzen",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Passwort zurücksetzen</h2>
        <p>Du hast eine Passwort-Zurücksetzung angefordert:</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Passwort zurücksetzen
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">
          Der Link ist 15 Minuten gültig. Falls du das nicht angefordert hast, kannst du diese Mail ignorieren.
        </p>
      </div>
    `,
  })
}

export async function sendDeleteAccountMail(email, token) {
  const link = `${baseUrl()}/confirm-delete?token=${token}`
  await createTransport().sendMail({
    from: from(),
    to: email,
    subject: "DockWallet – Konto löschen bestätigen",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Konto löschen</h2>
        <p>Du hast die Löschung deines Kontos angefordert. Alle deine Daten werden unwiderruflich gelöscht.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Konto jetzt löschen
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">
          Der Link ist 15 Minuten gültig. Falls du das nicht angefordert hast, kannst du diese Mail ignorieren.
        </p>
      </div>
    `,
  })
}
