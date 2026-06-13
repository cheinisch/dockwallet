import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("loading")
  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) { setStatus("error"); return }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => setStatus(res.ok ? "success" : "error"))
      .catch(() => setStatus("error"))
  }, [token])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-wide">DockWallet</h1>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          {status === "loading" && (
            <p className="text-slate-400 text-sm">E-Mail wird bestätigt...</p>
          )}
          {status === "success" && (
            <>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">E-Mail bestätigt</h2>
              <p className="text-sm text-slate-400 mb-6">Dein Konto ist jetzt aktiv.</p>
              <Link to="/login" className="inline-block bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
                Zum Login
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Link ungültig</h2>
              <p className="text-sm text-slate-400 mb-6">Der Link ist abgelaufen oder ungültig.</p>
              <Link to="/login" className="text-sky-400 hover:text-sky-300 text-sm transition-colors">Zurück zum Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
