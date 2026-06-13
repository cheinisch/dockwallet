import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"

export default function Nav() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [user, setUser] = useState(null)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        setUser(payload)
      } catch {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate("/login")
  }

  const isActive = (path) => location.pathname === path

  const handleAddCard = () => {
    if (location.pathname === "/passes" || location.pathname === "/passes/add") {
      // Already on passes page — fire a custom event so Passes.jsx opens the modal directly
      window.dispatchEvent(new CustomEvent("dockwallet:add-pass"))
    } else {
      // Navigate to /passes/add so Passes mounts with add=true
      navigate("/passes/add")
    }
  }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Link to="/passes"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive("/passes") ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}>
          My Cards
        </Link>

        <button
          onClick={handleAddCard}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive("/passes/add") ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}>
          + Add Card
        </button>

        {user?.is_admin && (
          <Link to="/admin"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive("/admin") ? "bg-sky-500 text-slate-950" : "text-sky-400 hover:text-sky-300 hover:bg-slate-800"}`}>
            Admin
          </Link>
        )}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-800">
              <p className="text-xs text-slate-500">Angemeldet als</p>
              <p className="text-sm text-slate-200 truncate">{user?.username || user?.email}</p>
            </div>
            <Link to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Einstellungen
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors border-t border-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}