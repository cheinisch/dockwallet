import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }
}

function Badge({ active, children }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-500"}`}>
      {children}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <input {...props} className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
    </div>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-sky-500" : "bg-slate-700"}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  )
}

const emptyForm = { username: "", first_name: "", last_name: "", email: "", password: "", is_admin: false, is_active: true }

export default function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState(null) // null | "create" | "edit" | "password" | "delete"
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [newPassword, setNewPassword] = useState("")
  const [msg, setMsg] = useState({ type: "", text: "" })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", { headers: authHeaders() })
      if (res.status === 401 || res.status === 403) { navigate("/passes"); return }
      setUsers(await res.json())
    } catch { showMsg("error", "Fehler beim Laden") }
    finally { setLoading(false) }
  }

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: "", text: "" }), 4000)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setModal("create")
  }

  const openEdit = (user) => {
    setSelected(user)
    setForm({
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      password: "",
      is_admin: user.is_admin,
      is_active: user.is_active,
    })
    setModal("edit")
  }

  const openPassword = (user) => {
    setSelected(user)
    setNewPassword("")
    setModal("password")
  }

  const openDelete = (user) => {
    setSelected(user)
    setModal("delete")
  }

  const closeModal = () => {
    setModal(null)
    setSelected(null)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: authHeaders(), body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { showMsg("error", data.error); return }
      showMsg("success", "User angelegt")
      closeModal()
      fetchUsers()
    } catch { showMsg("error", "Serverfehler") }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { showMsg("error", data.error); return }
      showMsg("success", "User gespeichert")
      closeModal()
      fetchUsers()
    } catch { showMsg("error", "Serverfehler") }
    finally { setSaving(false) }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      showMsg("error", "Passwort muss mindestens 8 Zeichen lang sein")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/reset-password`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { showMsg("error", data.error); return }
      showMsg("success", "Passwort zurückgesetzt")
      closeModal()
    } catch { showMsg("error", "Serverfehler") }
    finally { setSaving(false) }
  }

  const handleResetMfa = async (user) => {
    if (!confirm(`MFA für ${user.username} zurücksetzen?`)) return
    const res = await fetch(`/api/admin/users/${user.id}/reset-mfa`, { method: "POST", headers: authHeaders() })
    const data = await res.json()
    showMsg(res.ok ? "success" : "error", data.message || data.error)
    fetchUsers()
  }

  const handleDeletePasskeys = async (user) => {
    if (!confirm(`Alle Passkeys von ${user.username} löschen?`)) return
    const res = await fetch(`/api/admin/users/${user.id}/passkeys`, { method: "DELETE", headers: authHeaders() })
    const data = await res.json()
    showMsg(res.ok ? "success" : "error", data.message || data.error)
    fetchUsers()
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, { method: "DELETE", headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) { showMsg("error", data.error); return }
      showMsg("success", "User gelöscht")
      closeModal()
      fetchUsers()
    } catch { showMsg("error", "Serverfehler") }
    finally { setSaving(false) }
  }

  const filtered = users.filter((u) =>
    [u.username, u.email, u.first_name, u.last_name].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  )

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Benutzerverwaltung</h1>
        <button onClick={openCreate}
          className="bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          User anlegen
        </button>
      </div>

      {msg.text && (
        <div className={`mb-4 text-sm rounded-lg px-3 py-2 border ${msg.type === "success" ? "text-green-400 bg-green-950 border-green-900" : "text-red-400 bg-red-950 border-red-900"}`}>
          {msg.text}
        </div>
      )}

      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen nach Name, E-Mail, Username..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm px-3 py-2.5 outline-none placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Keine User gefunden</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Auth</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Passes</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Erstellt</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-slate-100 font-medium">{user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {(user.first_name || user.last_name) && (
                        <p className="text-xs text-slate-500">{[user.first_name, user.last_name].filter(Boolean).join(" ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge active={user.is_active}>{user.is_active ? "Aktiv" : "Inaktiv"}</Badge>
                        {user.is_admin && <Badge active>Admin</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge active={user.mfa_enabled}>MFA</Badge>
                        <Badge active={user.passkey_count > 0}>Passkeys ({user.passkey_count})</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{user.pass_count}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(user.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(user)}
                          className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                          Bearbeiten
                        </button>
                        <button onClick={() => openPassword(user)}
                          className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                          Passwort
                        </button>
                        {user.mfa_enabled && (
                          <button onClick={() => handleResetMfa(user)}
                            className="text-xs text-yellow-500 hover:text-yellow-400 px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                            MFA reset
                          </button>
                        )}
                        {user.passkey_count > 0 && (
                          <button onClick={() => handleDeletePasskeys(user)}
                            className="text-xs text-yellow-500 hover:text-yellow-400 px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                            Passkeys
                          </button>
                        )}
                        <button onClick={() => openDelete(user)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User anlegen */}
      {modal === "create" && (
        <Modal title="User anlegen" onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Benutzername *" value={form.username} onChange={f("username")} placeholder="maxmustermann" />
              <Input label="E-Mail *" type="email" value={form.email} onChange={f("email")} placeholder="user@example.com" />
              <Input label="Vorname" value={form.first_name} onChange={f("first_name")} placeholder="Max" />
              <Input label="Nachname" value={form.last_name} onChange={f("last_name")} placeholder="Mustermann" />
            </div>
            <Input label="Passwort *" type="password" value={form.password} onChange={f("password")} placeholder="Mindestens 8 Zeichen" />
            <div className="space-y-3 pt-1">
              <Toggle label="Aktiv" description="User kann sich sofort anmelden" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
              <Toggle label="Admin" description="Zugriff auf das Admin-Dashboard" checked={form.is_admin} onChange={(v) => setForm({ ...form, is_admin: v })} />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreate} disabled={saving}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-5 py-2 rounded-lg transition-all">
                {saving ? "Anlegen..." : "Anlegen"}
              </button>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">Abbrechen</button>
            </div>
          </div>
        </Modal>
      )}

      {/* User bearbeiten */}
      {modal === "edit" && selected && (
        <Modal title={`User bearbeiten – ${selected.username}`} onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Benutzername *" value={form.username} onChange={f("username")} placeholder="maxmustermann" />
              <Input label="E-Mail *" type="email" value={form.email} onChange={f("email")} placeholder="user@example.com" />
              <Input label="Vorname" value={form.first_name} onChange={f("first_name")} placeholder="Max" />
              <Input label="Nachname" value={form.last_name} onChange={f("last_name")} placeholder="Mustermann" />
            </div>
            <div className="space-y-3 pt-1">
              <Toggle label="Aktiv" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
              <Toggle label="Admin" checked={form.is_admin} onChange={(v) => setForm({ ...form, is_admin: v })} />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleEdit} disabled={saving}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-5 py-2 rounded-lg transition-all">
                {saving ? "Speichern..." : "Speichern"}
              </button>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">Abbrechen</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Passwort zurücksetzen */}
      {modal === "password" && selected && (
        <Modal title={`Passwort – ${selected.username}`} onClose={closeModal}>
          <div className="space-y-4">
            <Input label="Neues Passwort" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} placeholder="Mindestens 8 Zeichen" />
            <div className="flex gap-2 pt-2">
              <button onClick={handleResetPassword} disabled={saving}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-5 py-2 rounded-lg transition-all">
                {saving ? "Speichern..." : "Zurücksetzen"}
              </button>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">Abbrechen</button>
            </div>
          </div>
        </Modal>
      )}

      {/* User löschen */}
      {modal === "delete" && selected && (
        <Modal title="User löschen" onClose={closeModal}>
          <div className="space-y-4">
            <div className="bg-red-950 border border-red-900 rounded-lg px-4 py-3">
              <p className="text-sm text-red-300">
                <span className="font-semibold">{selected.username}</span> wird unwiderruflich gelöscht –
                inklusive aller Boarding Passes ({selected.pass_count}).
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={saving}
                className="bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-all">
                {saving ? "Löschen..." : "Endgültig löschen"}
              </button>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">Abbrechen</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
