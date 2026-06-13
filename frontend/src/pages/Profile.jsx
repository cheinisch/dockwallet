import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { startRegistration } from "@simplewebauthn/browser"

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }
}

export default function Profile() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ username: "", first_name: "", last_name: "", email: "" })
  const [passkeys, setPasskeys] = useState([])
  const [mfaStep, setMfaStep] = useState(null) // null | "setup" | "disable"
  const [mfaData, setMfaData] = useState(null)
  const [mfaCode, setMfaCode] = useState("")
  const [smtpConfigured, setSmtpConfigured] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [mailSending, setMailSending] = useState(false)
  const [newDeviceName, setNewDeviceName] = useState("")
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUser()
    fetchPasskeys()
    fetch("/api/auth/mfa/smtp-status", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setSmtpConfigured(d.smtpConfigured))
      .catch(() => {})
  }, [])

  const fetchUser = async () => {
    const res = await fetch("/api/auth/me", { headers: authHeaders() })
    if (!res.ok) { navigate("/login"); return }
    const data = await res.json()
    setUser(data)
    setForm({ username: data.username || "", first_name: data.first_name || "", last_name: data.last_name || "", email: data.email || "" })
  }

  const fetchPasskeys = async () => {
    const res = await fetch("/api/auth/passkeys", { headers: authHeaders() })
    if (res.ok) setPasskeys(await res.json())
  }

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: "", text: "" }), 4000)
  }

  const handleProfileSave = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/profile", { method: "PUT", headers: authHeaders(), body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { showMsg("error", data.error); return }
      showMsg("success", "Profil gespeichert")
      setUser(data)
    } catch { showMsg("error", "Server nicht erreichbar") }
    finally { setLoading(false) }
  }

  const handleMfaSetup = async () => {
    const res = await fetch("/api/auth/mfa/setup", { method: "POST", headers: authHeaders() })
    const data = await res.json()
    if (!res.ok) { showMsg("error", data.error); return }
    setMfaData(data)
    setMfaStep("setup")
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(mfaData.secret)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleSendCodeMail = async () => {
    setMailSending(true)
    try {
      const res = await fetch("/api/auth/mfa/send-code", { method: "POST", headers: authHeaders() })
      const data = await res.json()
      showMsg(res.ok ? "success" : "error", data.message || data.error)
    } catch { showMsg("error", "Serverfehler") }
    finally { setMailSending(false) }
  }

  const handleMfaEnable = async () => {
    const res = await fetch("/api/auth/mfa/enable", { method: "POST", headers: authHeaders(), body: JSON.stringify({ token: mfaCode }) })
    const data = await res.json()
    if (!res.ok) { showMsg("error", data.error); return }
    showMsg("success", "MFA aktiviert")
    setMfaStep(null); setMfaCode(""); setMfaData(null)
    fetchUser()
  }

  const handleMfaDisable = async () => {
    const res = await fetch("/api/auth/mfa/disable", { method: "POST", headers: authHeaders(), body: JSON.stringify({ token: mfaCode }) })
    const data = await res.json()
    if (!res.ok) { showMsg("error", data.error); return }
    showMsg("success", "MFA deaktiviert")
    setMfaStep(null); setMfaCode("")
    fetchUser()
  }

  const handleAddPasskey = async () => {
    try {
      const optRes = await fetch("/api/auth/passkey/register/options", { method: "POST", headers: authHeaders() })
      const options = await optRes.json()
      const credential = await startRegistration(options)
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ credential, deviceName: newDeviceName || "Neues Gerät" }),
      })
      const data = await verifyRes.json()
      if (!verifyRes.ok) { showMsg("error", data.error); return }
      showMsg("success", "Passkey registriert")
      setNewDeviceName("")
      fetchPasskeys()
    } catch { showMsg("error", "Passkey-Registrierung fehlgeschlagen") }
  }

  const handleDeletePasskey = async (id) => {
    await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE", headers: authHeaders() })
    fetchPasskeys()
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Wirklich Konto löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return
    const res = await fetch("/api/auth/delete-account/request", { method: "POST", headers: authHeaders() })
    const data = await res.json()
    if (!res.ok) { showMsg("error", data.error); return }
    showMsg("success", "Bestätigungs-Mail wurde gesendet")
  }

  if (!user) return <div className="p-8 text-slate-400 text-sm">Laden...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Mein Profil</h1>

      {msg.text && (
        <div className={`text-sm rounded-lg px-3 py-2 border ${msg.type === "success" ? "text-green-400 bg-green-950 border-green-900" : "text-red-400 bg-red-950 border-red-900"}`}>
          {msg.text}
        </div>
      )}

      {/* Profil */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Persönliche Daten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Benutzername", key: "username", type: "text", placeholder: "maxmustermann" },
            { label: "E-Mail", key: "email", type: "email", placeholder: "user@example.com" },
            { label: "Vorname", key: "first_name", type: "text", placeholder: "Max" },
            { label: "Nachname", key: "last_name", type: "text", placeholder: "Mustermann" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
              <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
            </div>
          ))}
        </div>
        <button onClick={handleProfileSave} disabled={loading}
          className="bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-50 text-slate-950 font-semibold text-sm px-5 py-2 rounded-lg transition-all">
          {loading ? "Speichern..." : "Speichern"}
        </button>
      </section>

      {/* MFA */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-300">Zwei-Faktor-Authentifizierung</h2>
            <p className="text-xs text-slate-500 mt-0.5">TOTP per Authenticator-App</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.mfa_enabled ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-500"}`}>
            {user.mfa_enabled ? "Aktiv" : "Inaktiv"}
          </span>
        </div>

        {mfaStep === "setup" && mfaData && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Scanne den QR-Code mit deiner Authenticator-App oder kopiere den Code manuell:</p>

            {/* QR Code */}
            <div className="flex justify-center">
              <img src={mfaData.qrCode} alt="MFA QR" className="w-44 h-44 rounded-xl bg-white p-2" />
            </div>

            {/* Secret kopieren */}
            <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-300 font-mono break-all">{mfaData.secret}</p>
              <button onClick={handleCopySecret}
                className="shrink-0 text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium">
                {codeCopied ? "✓ Kopiert" : "Kopieren"}
              </button>
            </div>

            {/* Per Mail senden */}
            {smtpConfigured ? (
              <button onClick={handleSendCodeMail} disabled={mailSending}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium py-2 rounded-lg transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {mailSending ? "Sende..." : "Code per E-Mail senden"}
              </button>
            ) : (
              <div className="flex items-start gap-2 bg-yellow-950/40 border border-yellow-900/60 rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-xs text-yellow-400">SMTP nicht konfiguriert. Richte SMTP in der <code className="font-mono">.env</code> ein, um Codes per E-Mail zu versenden.</p>
              </div>
            )}

            {/* Code eingeben */}
            <input type="text" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)}
              placeholder="6-stelliger Code zur Bestätigung" maxLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-center tracking-widest" />
            <div className="flex gap-2">
              <button onClick={handleMfaEnable} className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition-all">Aktivieren</button>
              <button onClick={() => { setMfaStep(null); setMfaCode(""); setMfaData(null) }} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">Abbrechen</button>
            </div>
          </div>
        )}

        {mfaStep === "disable" && (
          <div className="space-y-3">
            <input type="text" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Code aus Authenticator-App" maxLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-center tracking-widest" />
            <div className="flex gap-2">
              <button onClick={handleMfaDisable} className="bg-red-500 hover:bg-red-400 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all">Deaktivieren</button>
              <button onClick={() => { setMfaStep(null); setMfaCode("") }} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">Abbrechen</button>
            </div>
          </div>
        )}

        {!mfaStep && (
          user.mfa_enabled
            ? <button onClick={() => setMfaStep("disable")} className="text-sm text-red-400 hover:text-red-300 transition-colors">MFA deaktivieren</button>
            : <button onClick={handleMfaSetup} className="text-sm text-sky-400 hover:text-sky-300 transition-colors">MFA einrichten</button>
        )}
      </section>

      {/* Passkeys */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Passkeys</h2>
        {passkeys.length > 0 ? (
          <ul className="space-y-2">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm text-slate-200">{pk.device_name}</p>
                  <p className="text-xs text-slate-500">{new Date(pk.created_at).toLocaleDateString("de-DE")}</p>
                </div>
                <button onClick={() => handleDeletePasskey(pk.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Entfernen</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Noch keine Passkeys registriert.</p>
        )}
        <div className="flex gap-2">
          <input type="text" value={newDeviceName} onChange={(e) => setNewDeviceName(e.target.value)}
            placeholder="Gerätename (optional)"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
          <button onClick={handleAddPasskey} className="bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium px-4 py-2 rounded-lg transition-all">
            Hinzufügen
          </button>
        </div>
      </section>

      {/* Konto löschen */}
      {!user.is_admin && (
        <section className="bg-slate-900 border border-red-900/50 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-red-400 mb-1">Gefahrenzone</h2>
          <p className="text-xs text-slate-500 mb-4">Das Löschen deines Kontos ist unwiderruflich. Alle Daten werden entfernt.</p>
          <button onClick={handleDeleteAccount} className="bg-red-500/10 hover:bg-red-500/20 border border-red-900 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-all">
            Konto löschen
          </button>
        </section>
      )}
    </div>
  )
}