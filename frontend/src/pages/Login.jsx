import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { startAuthentication } from "@simplewebauthn/browser"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [mfaToken, setMfaToken] = useState("")
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState("")
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch("/api/auth/config")
      .then((res) => res.json())
      .then((data) => setRegistrationEnabled(data.registrationEnabled))
      .catch(() => {})
  }, [])

  const handleLogin = async () => {
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, mfaToken: mfaRequired ? mfaToken : undefined }),
      })
      const data = await res.json()

      if (res.status === 200 && data.mfaRequired) {
        setMfaRequired(true)
        return
      }
      if (!res.ok) {
        setError(data.error || "Anmeldung fehlgeschlagen")
        return
      }

      localStorage.setItem("token", data.token)
      navigate("/passes")
    } catch {
      setError("Server nicht erreichbar")
    }
  }

  const handlePasskeyLogin = async () => {
    setError("")
    setPasskeyLoading(true)
    try {
      const optRes = await fetch("/api/auth/passkey/login/options", { method: "POST" })
      const options = await optRes.json()
      const credential = await startAuthentication(options)

      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      })
      const data = await verifyRes.json()
      if (!verifyRes.ok) {
        setError(data.error || "Passkey-Anmeldung fehlgeschlagen")
        return
      }
      localStorage.setItem("token", data.token)
      navigate("/passes")
    } catch {
      setError("Passkey-Anmeldung fehlgeschlagen")
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-wide">DockWallet</h1>
          <p className="text-sm text-slate-500 mt-1">Self-hosted pass manager</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">{error}</div>
          )}

          {!mfaRequired ? (
            <>
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Username / Mail</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="user@example.com" autoComplete="username"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
              <div className="mb-2">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
              <div className="mb-6 text-right">
                <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-sky-400 transition-colors">
                  Passwort vergessen?
                </Link>
              </div>
              <button onClick={handleLogin}
                className="w-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all">
                Login
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-600">oder</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <button onClick={handlePasskeyLogin} disabled={passkeyLoading}
                className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-50 text-slate-100 font-medium text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {passkeyLoading ? "Warten..." : "Mit Passkey anmelden"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-4">Bitte gib deinen 6-stelligen MFA-Code ein:</p>
              <div className="mb-6">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">MFA-Code</label>
                <input type="text" value={mfaToken} onChange={(e) => setMfaToken(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="000000" maxLength={6} autoComplete="one-time-code"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-center tracking-widest text-lg" />
              </div>
              <button onClick={handleLogin}
                className="w-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all">
                Bestätigen
              </button>
              <button onClick={() => { setMfaRequired(false); setMfaToken("") }}
                className="w-full mt-2 text-sm text-slate-500 hover:text-slate-300 transition-colors py-1">
                Zurück
              </button>
            </>
          )}

          {registrationEnabled && !mfaRequired && (
            <p className="text-center text-sm text-slate-500 mt-4">
              Noch kein Konto?{" "}
              <Link to="/register" className="text-sky-400 hover:text-sky-300 transition-colors">Registrieren</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
