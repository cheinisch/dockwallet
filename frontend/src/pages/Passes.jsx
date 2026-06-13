import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconUpload() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}
function IconQr() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4H4v8h8V4zm8 0h-8v8h8V4zM4 12v8h8v-8H4zm8 4h8" />
      <rect x="4" y="4" width="4" height="4" rx="0.5" strokeWidth={2} />
      <rect x="16" y="4" width="4" height="4" rx="0.5" strokeWidth={2} />
      <rect x="4" y="16" width="4" height="4" rx="0.5" strokeWidth={2} />
    </svg>
  )
}
function IconPlane() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
function IconClose() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// ─── QR Scanner (uses jsQR via CDN loaded dynamically) ────────────────────────
function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadJsQR = () =>
      new Promise((resolve, reject) => {
        if (window.jsQR) return resolve(window.jsQR)
        const s = document.createElement("script")
        s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
        s.onload = () => resolve(window.jsQR)
        s.onerror = reject
        document.head.appendChild(s)
      })

    const startCamera = async () => {
      try {
        const jsQR = await loadJsQR()
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          setScanning(true)
        }

        const tick = () => {
          if (!mounted) return
          const video = videoRef.current
          const canvas = canvasRef.current
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext("2d")
            ctx.drawImage(video, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, canvas.width, canvas.height)
            if (code?.data) {
              stopCamera()
              onResult(code.data)
              return
            }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (e) {
        if (mounted) setError("Kamera konnte nicht gestartet werden: " + e.message)
      }
    }

    startCamera()
    return () => {
      mounted = false
      stopCamera()
    }
  }, [onResult, stopCamera])

  return (
    <div className="flex flex-col items-center gap-4">
      {error ? (
        <div className="w-full rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : (
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-900">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {/* Viewfinder overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2/3 aspect-square border-2 border-sky-400 rounded-lg opacity-70" />
          </div>
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                <span className="text-sm">Kamera wird gestartet…</span>
              </div>
            </div>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-slate-400 text-center">
        Halte den QR-Code auf deinem Boarding Pass in den Rahmen
      </p>
      <button onClick={() => { stopCamera(); onClose() }}
        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
        Abbrechen
      </button>
    </div>
  )
}

// ─── Add Pass Modal ────────────────────────────────────────────────────────────
function AddPassModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState("upload") // "upload" | "qr" | "url"
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [urlInput, setUrlInput] = useState("")
  const [showQr, setShowQr] = useState(false)
  const fileInputRef = useRef(null)

  const token = localStorage.getItem("token")

  const uploadFile = async (file) => {
    if (!file) return
    if (!file.name.endsWith(".pkpass") && file.type !== "application/vnd.apple.pkpass") {
      setError("Nur .pkpass Dateien werden unterstützt")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch("/api/passes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ file: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen")
      onSuccess(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const importUrl = async (url) => {
    const u = url || urlInput
    if (!u.trim()) { setError("Bitte eine URL eingeben"); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/passes/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: u.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import fehlgeschlagen")
      onSuccess(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const onQrResult = (value) => {
    setShowQr(false)
    // Wenn der gescannte Wert eine URL ist → importieren
    if (value.startsWith("http://") || value.startsWith("https://")) {
      setTab("url")
      setUrlInput(value)
      importUrl(value)
    } else {
      setError("Der QR-Code enthält keine gültige .pkpass-URL")
      setTab("upload")
    }
  }

  // Backdrop click closes modal
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full sm:max-w-md sm:mx-4 bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Pass hinzufügen</h2>
            <p className="text-xs text-slate-500 mt-0.5">Boarding Pass importieren</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <IconClose />
          </button>
        </div>

        {/* Tabs */}
        {!showQr && (
          <div className="flex px-5 pt-4 gap-2">
            {[
              { id: "upload", label: "Datei", icon: <IconUpload /> },
              { id: "qr", label: "QR-Code", icon: <IconQr /> },
              { id: "url", label: "URL", icon: null },
            ].map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(null) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4 space-y-3">
          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* ── File Upload Tab ── */}
          {tab === "upload" && !showQr && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-10 ${
                  dragging
                    ? "border-sky-400 bg-sky-400/5"
                    : "border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800/60"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <IconUpload />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">
                    {dragging ? "Loslassen…" : ".pkpass Datei hierher ziehen"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">oder tippen zum Auswählen</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pkpass,application/vnd.apple.pkpass"
                  className="hidden"
                  onChange={(e) => uploadFile(e.target.files[0])}
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                  Wird verarbeitet…
                </div>
              )}
            </>
          )}

          {/* ── QR Code Tab ── */}
          {tab === "qr" && !showQr && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-20 h-20 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m9-17h3a1 1 0 011 1v3m0 9v3a1 1 0 01-1 1h-3M7 7h2v2H7zm0 4h2v2H7zm4-4h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">QR-Code scannen</p>
                <p className="text-xs text-slate-500 mt-1">
                  Scanne den QR-Code auf deiner Buchungsbestätigung oder einem Boarding Pass Link
                </p>
              </div>
              <button onClick={() => setShowQr(true)}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
                <IconQr />
                Kamera öffnen
              </button>
            </div>
          )}

          {/* ── QR Scanner active ── */}
          {tab === "qr" && showQr && (
            <QrScanner onResult={onQrResult} onClose={() => setShowQr(false)} />
          )}

          {/* ── URL Tab ── */}
          {tab === "url" && !showQr && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Pass-URL</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && importUrl()}
                  placeholder="https://example.com/pass.pkpass"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-sky-500 focus:outline-none text-sm text-slate-100 placeholder-slate-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Direkt-Link zu einer .pkpass-Datei, z.B. aus einer E-Mail oder QR-Code
                </p>
              </div>
              <button
                onClick={() => importUrl()}
                disabled={loading || !urlInput.trim()}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird importiert…
                  </>
                ) : (
                  "Pass importieren"
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bottom safe area for mobile */}
        <div className="h-safe-area-inset-bottom sm:hidden" />
      </div>
    </div>
  )
}

// ─── Pass Card ────────────────────────────────────────────────────────────────
function PassCard({ pass, onDelete }) {
  const fmt = (iso) => {
    if (!iso) return "–"
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso))
  }

  return (
    <div className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-colors">
      {/* Colored stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-sky-500 to-blue-600" />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
              <IconPlane />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {pass.airline || "Unbekannte Airline"}
                {pass.flight_number && (
                  <span className="ml-1.5 font-mono text-xs text-slate-400">
                    {pass.flight_number}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {pass.passenger_name || "–"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDelete(pass.id)}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
          >
            <IconTrash />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="font-mono font-bold text-slate-200 text-base tracking-wider">
            {pass.origin || "???"}
          </span>
          <div className="flex-1 border-t border-dashed border-slate-700 relative">
            <div className="absolute inset-x-0 -top-1.5 flex justify-center">
              <svg className="w-3 h-3 text-slate-600 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </div>
          </div>
          <span className="font-mono font-bold text-slate-200 text-base tracking-wider">
            {pass.destination || "???"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div>
            <span className="text-slate-600 uppercase tracking-wider text-[10px]">Abflug</span>
            <p className="text-slate-300 mt-0.5">{fmt(pass.departure_time)}</p>
          </div>
          <div>
            <span className="text-slate-600 uppercase tracking-wider text-[10px]">Ankunft</span>
            <p className="text-slate-300 mt-0.5">{fmt(pass.arrival_time)}</p>
          </div>
          {pass.seat && (
            <div>
              <span className="text-slate-600 uppercase tracking-wider text-[10px]">Sitz</span>
              <p className="text-slate-300 mt-0.5 font-mono">{pass.seat}</p>
            </div>
          )}
          {pass.booking_reference && (
            <div>
              <span className="text-slate-600 uppercase tracking-wider text-[10px]">Buchungs-Nr.</span>
              <p className="text-slate-300 mt-0.5 font-mono">{pass.booking_reference}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Passes({ add }) {
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(!!add)
  const navigate = useNavigate()
  const token = localStorage.getItem("token")

  const fetchPasses = async () => {
    try {
      const res = await fetch("/api/passes", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setPasses(await res.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPasses() }, [])

  const handleSuccess = (newPass) => {
    setPasses((prev) => [newPass, ...prev])
    setShowModal(false)
    navigate("/passes", { replace: true })
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Pass wirklich löschen?")) return
    try {
      const res = await fetch(`/api/passes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setPasses((prev) => prev.filter((p) => p.id !== id))
    } catch {
      // silent
    }
  }

  const openModal = () => {
    setShowModal(true)
    navigate("/passes/add", { replace: true })
  }

  const closeModal = () => {
    setShowModal(false)
    navigate("/passes", { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Meine Pässe</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {passes.length === 0 ? "Noch keine Pässe" : `${passes.length} Pass${passes.length !== 1 ? "e" : ""}`}
            </p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors shadow-lg shadow-sky-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Hinzufügen
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-sky-400 rounded-full animate-spin mr-3" />
            Lädt…
          </div>
        )}

        {/* Empty state */}
        {!loading && passes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600">
              <IconPlane />
            </div>
            <div>
              <p className="text-slate-400 font-medium">Keine Pässe vorhanden</p>
              <p className="text-sm text-slate-600 mt-1">
                Füge deinen ersten Boarding Pass hinzu
              </p>
            </div>
            <button
              onClick={openModal}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
            >
              Jetzt hinzufügen
            </button>
          </div>
        )}

        {/* Pass list */}
        {!loading && passes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {passes.map((pass) => (
              <PassCard key={pass.id} pass={pass} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddPassModal onClose={closeModal} onSuccess={handleSuccess} />
      )}
    </div>
  )
}