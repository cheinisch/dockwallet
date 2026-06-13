import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import PassGridCard from "../components/passes/PassGridCard.jsx"
import PassDetailOverlay from "../components/passes/PassDetailOverlay.jsx"
import { IconPlane, IconPlus, IconUpload, IconQr, IconClose } from "../components/passes/passUtils.jsx"

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QrScanner({ onResult, onClose }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const [error, setError]       = useState(null)
  const [scanning, setScanning] = useState(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadJsQR = () => new Promise((resolve, reject) => {
      if (window.jsQR) return resolve(window.jsQR)
      const s = document.createElement("script")
      s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
      s.onload = () => resolve(window.jsQR); s.onerror = reject
      document.head.appendChild(s)
    })
    const start = async () => {
      try {
        const jsQR   = await loadJsQR()
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setScanning(true) }
        const tick = () => {
          if (!mounted) return
          const v = videoRef.current, c = canvasRef.current
          if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
            c.width = v.videoWidth; c.height = v.videoHeight
            const ctx = c.getContext("2d"); ctx.drawImage(v, 0, 0)
            const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
            if (code?.data) { stopCamera(); onResult(code.data); return }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (e) { if (mounted) setError("Kamera nicht verfügbar: " + e.message) }
    }
    start()
    return () => { mounted = false; stopCamera() }
  }, [onResult, stopCamera])

  return (
    <div className="flex flex-col items-center gap-4">
      {error
        ? <div className="w-full rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>
        : <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-900">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2/3 aspect-square border-2 border-sky-400 rounded-lg opacity-70" />
            </div>
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-2 text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                <span className="text-sm">Kamera startet…</span>
              </div>
            )}
          </div>
      }
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-slate-400 text-center">QR-Code auf Buchungsbestätigung halten</p>
      <button onClick={() => { stopCamera(); onClose() }}
        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
        Abbrechen
      </button>
    </div>
  )
}

// ─── Add Pass Modal ───────────────────────────────────────────────────────────
function AddPassModal({ onClose, onSuccess }) {
  const [tab, setTab]           = useState("upload")
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [urlInput, setUrlInput] = useState("")
  const [showQr, setShowQr]     = useState(false)
  const fileInputRef = useRef(null)
  const token = localStorage.getItem("token")

  const uploadFile = async (file) => {
    if (!file) return
    if (!file.name.endsWith(".pkpass") && file.type !== "application/vnd.apple.pkpass")
      return setError("Nur .pkpass Dateien werden unterstützt")
    setLoading(true); setError(null)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file)
      })
      const resp = await fetch("/api/passes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ file: base64 }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || "Upload fehlgeschlagen")
      onSuccess(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const importUrl = async (url) => {
    const u = url || urlInput
    if (!u.trim()) return setError("Bitte eine URL eingeben")
    setLoading(true); setError(null)
    try {
      const resp = await fetch("/api/passes/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: u.trim() }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || "Import fehlgeschlagen")
      onSuccess(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const onQrResult = (value) => {
    setShowQr(false)
    if (value.startsWith("http://") || value.startsWith("https://")) { setTab("url"); setUrlInput(value); importUrl(value) }
    else { setError("QR-Code enthält keine gültige .pkpass-URL"); setTab("upload") }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md sm:mx-4 bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Pass hinzufügen</h2>
            <p className="text-xs text-slate-500 mt-0.5">Boarding Pass importieren</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <IconClose />
          </button>
        </div>

        {!showQr && (
          <div className="flex px-5 pt-4 gap-2">
            {[{ id: "upload", label: "Datei", icon: <IconUpload /> }, { id: "qr", label: "QR-Code", icon: <IconQr /> }, { id: "url", label: "URL" }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(null) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          {error && <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>}

          {tab === "upload" && !showQr && (
            <>
              <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files[0]) }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-10 ${
                  dragging ? "border-sky-400 bg-sky-400/5" : "border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800/60"
                }`}>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400"><IconUpload /></div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">{dragging ? "Loslassen…" : ".pkpass Datei hierher ziehen"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">oder tippen zum Auswählen</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pkpass,application/vnd.apple.pkpass" className="hidden"
                  onChange={e => uploadFile(e.target.files[0])} />
              </div>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />Wird verarbeitet…
                </div>
              )}
            </>
          )}

          {tab === "qr" && !showQr && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-20 h-20 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.5}/>
                  <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.5}/>
                  <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.5}/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">QR-Code scannen</p>
                <p className="text-xs text-slate-500 mt-1">Scanne den QR-Code auf deiner Buchungsbestätigung</p>
              </div>
              <button onClick={() => setShowQr(true)}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
                <IconQr />Kamera öffnen
              </button>
            </div>
          )}

          {tab === "qr" && showQr && <QrScanner onResult={onQrResult} onClose={() => setShowQr(false)} />}

          {tab === "url" && !showQr && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Pass-URL</label>
                <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && importUrl()}
                  placeholder="https://example.com/pass.pkpass"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-sky-500 focus:outline-none text-sm text-slate-100 placeholder-slate-500 transition-colors" />
              </div>
              <button onClick={() => importUrl()} disabled={loading || !urlInput.trim()}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importiert…</> : "Pass importieren"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center px-8">
      <div className="relative">
        <div className="absolute inset-0 bg-white rounded-2xl rotate-6 scale-95 opacity-20" />
        <div className="absolute inset-0 bg-white rounded-2xl rotate-3 scale-97 opacity-40" />
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-slate-400 relative shadow-lg">
          <IconPlane />
        </div>
      </div>
      <div>
        <p className="text-slate-300 font-semibold text-lg">Keine Pässe vorhanden</p>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          Importiere deinen ersten Pass über<br />
          <span className="text-slate-500">„+ Add Card"</span> in der Navigationsleiste.
        </p>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors shadow-lg shadow-sky-500/20">
        <IconPlus />Ersten Pass hinzufügen
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Passes({ add }) {
  const [passes, setPasses]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(!!add)
  const [selectedPass, setSelectedPass] = useState(null)
  const navigate = useNavigate()
  const token = localStorage.getItem("token")

  const fetchPasses = async () => {
    try {
      const res = await fetch("/api/passes", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      setPasses(await res.json())
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { fetchPasses() }, [])
  useEffect(() => { if (add) setShowModal(true) }, [add])
  useEffect(() => {
    const handler = () => setShowModal(true)
    window.addEventListener("dockwallet:add-pass", handler)
    return () => window.removeEventListener("dockwallet:add-pass", handler)
  }, [])

  const handleSuccess = (newPass) => {
    setPasses(prev => [newPass, ...prev])
    setShowModal(false)
    navigate("/passes", { replace: true })
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/passes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { setPasses(prev => prev.filter(p => p.id !== id)); setSelectedPass(null) }
    } catch { }
  }

  const closeModal = () => { setShowModal(false); navigate("/passes", { replace: true }) }
  const openAdd    = () => { setShowModal(true);  navigate("/passes/add", { replace: true }) }

  const isExpiredOrVoided = (p) => {
    if (p.is_voided) return true
    // Aus DB-Feld
    if (p.expiration_date && new Date(p.expiration_date) < new Date()) return true
    // Fallback: aus raw_data (für ältere Einträge ohne expiration_date in DB)
    const raw = p.raw_data
      ? (typeof p.raw_data === "string"
          ? (() => { try { return JSON.parse(p.raw_data) } catch { return null } })()
          : p.raw_data)
      : null
    if (raw?.expirationDate && new Date(raw.expirationDate) < new Date()) return true
    if (raw?.voided === true) return true
    return false
  }

  const upcoming = passes.filter(p =>
    !isExpiredOrVoided(p) && (!p.departure_time || new Date(p.departure_time) >= new Date())
  )
  const past = passes.filter(p =>
    isExpiredOrVoided(p) || (p.departure_time && new Date(p.departure_time) < new Date())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-100">Meine Pässe</h1>
          {!loading && passes.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">{passes.length} Pass{passes.length !== 1 ? "e" : ""}</p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-sky-400 rounded-full animate-spin mr-3" />Lädt…
          </div>
        )}

        {!loading && passes.length === 0 && <EmptyState onAdd={openAdd} />}

        {!loading && upcoming.length > 0 && (
          <section className="mb-8">
            {past.length > 0 && <p className="text-[11px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Bevorstehend</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcoming.map(p => <PassGridCard key={p.id} pass={p} onClick={() => setSelectedPass(p)} />)}
            </div>
          </section>
        )}

        {!loading && past.length > 0 && (
          <section>
            <p className="text-[11px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Abgelaufen & Vergangen</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {past.map(p => <PassGridCard key={p.id} pass={p} onClick={() => setSelectedPass(p)} />)}
            </div>
          </section>
        )}
      </div>

      {selectedPass && (
        <PassDetailOverlay pass={selectedPass} onClose={() => setSelectedPass(null)} onDelete={handleDelete} />
      )}
      {showModal && <AddPassModal onClose={closeModal} onSuccess={handleSuccess} />}
    </div>
  )
}