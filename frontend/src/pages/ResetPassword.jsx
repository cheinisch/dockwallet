import { useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const token = searchParams.get("token")
  const navigate = useNavigate()

  const handleReset = async () => {
    setError("")
    if (!password || !confirm) { setError("Bitte alle Felder ausfüllen"); return }
    if (password !== confirm) { setError("Passwörter stimmen nicht überein"); return }
    if (password.length < 8) { setError("Passwort muss mindestens 8 Zeichen lang sein"); return }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Fehler beim Zurücksetzen"); return }
      setSuccess(true)
      setTimeout(() => navigate("/login"), 3000)
    } catch {
      setError("Server nicht erreichbar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-wide">DockWallet</h1>
          <p className="text-sm text-slate-500 mt-1">Neues Passwort setzen</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-slate-300 mb-1">Passwort erfolgreich geändert.</p>
              <p className="text-sm text-slate-500">Du wirst weitergeleitet...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">{error}</div>
              )}
              {!token && (
                <div className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">Ungültiger Link.</div>
              )}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Neues Passwort</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()} placeholder="••••••••" autoComplete="new-password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
              <div className="mb-6">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Passwort bestätigen</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()} placeholder="••••••••" autoComplete="new-password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
              <button onClick={handleReset} disabled={loading || !token}
                className="w-full bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-50 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all">
                {loading ? "Speichern..." : "Passwort ändern"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
