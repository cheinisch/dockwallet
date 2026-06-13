import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
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
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        setError("Ungültige Anmeldedaten")
        return
      }
      const data = await res.json()
      localStorage.setItem("token", data.token)
      navigate("/passes")
    } catch {
      setError("Server nicht erreichbar")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-wide">
            DockWallet
          </h1>
          <p className="text-sm text-slate-500 mt-1">Self-hosted pass manager</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Username / Mail
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="user@example.com"
              autoComplete="username"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all"
          >
            Login
          </button>
          {registrationEnabled && (
            <p className="text-center text-sm text-slate-500 mt-4">
              Noch kein Konto?{" "}
              <Link
                to="/register"
                className="text-sky-400 hover:text-sky-300 transition-colors"
              >
                Registrieren
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}