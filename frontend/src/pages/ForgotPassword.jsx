import { useState } from "react"
import { Link } from "react-router-dom"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError("")
    if (!email) { setError("Bitte E-Mail eingeben"); return }
    setLoading(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setSent(true)
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
          <p className="text-sm text-slate-500 mt-1">Passwort zurücksetzen</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-300 mb-1">Falls die E-Mail registriert ist,</p>
              <p className="text-sm text-slate-400 mb-6">haben wir dir einen Link gesendet.</p>
              <Link to="/login" className="text-sky-400 hover:text-sky-300 text-sm transition-colors">Zurück zum Login</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">{error}</div>
              )}
              <div className="mb-6">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">E-Mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="user@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
              <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-50 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all">
                {loading ? "Sende..." : "Link senden"}
              </button>
              <p className="text-center text-sm text-slate-500 mt-4">
                <Link to="/login" className="text-sky-400 hover:text-sky-300 transition-colors">Zurück zum Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
