import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch("/api/auth/config")
      .then((res) => res.json())
      .then((data) => {
        if (!data.registrationEnabled) navigate("/login", { replace: true })
      })
      .catch(() => navigate("/login", { replace: true }))
  }, [navigate])

  const handleRegister = async () => {
    setError("")

    if (!email || !password || !confirm) {
      setError("Bitte alle Felder ausfüllen")
      return
    }
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein")
      return
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registrierung fehlgeschlagen")
        return
      }

      localStorage.setItem("token", data.token)
      navigate("/passes")
    } catch {
      setError("Server nicht erreichbar")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleRegister()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-wide">
            DockWallet
          </h1>
          <p className="text-sm text-slate-500 mt-1">Neues Konto erstellen</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="user@example.com"
              autoComplete="email"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all"
          >
            {loading ? "Registrierung..." : "Konto erstellen"}
          </button>
          <p className="text-center text-sm text-slate-500 mt-4">
            Bereits ein Konto?{" "}
            <Link
              to="/login"
              className="text-sky-400 hover:text-sky-300 transition-colors"
            >
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}