import { useState } from "react"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = () => {
    // TODO: API call to /api/auth/login
    console.log("Login:", username)
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

          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Username / Mail
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Login
          </button>

        </div>

      </div>
    </div>
  )
}