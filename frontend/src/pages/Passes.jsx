import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso, opts) => {
  if (!iso) return "–"
  return new Intl.DateTimeFormat("de-DE", opts).format(new Date(iso))
}
const fmtDate = (iso) => fmt(iso, { day: "2-digit", month: "short", year: "numeric" })
const fmtTime = (iso) => fmt(iso, { hour: "2-digit", minute: "2-digit" })
const fmtFull = (iso) => fmt(iso, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

function extractPassDetails(raw) {
  if (!raw) return { back: [], extra: {} }
  const bp = raw.boardingPass || raw.coupon || raw.eventTicket || raw.storeCard || raw.generic || {}
  const back = bp.backFields || []
  const extra = {}
  if (raw.description)    extra["Beschreibung"]  = raw.description
  if (raw.serialNumber)   extra["Seriennummer"]  = raw.serialNumber
  if (raw.expirationDate) extra["Gültig bis"]    = fmtFull(raw.expirationDate)
  if (raw.relevantDate)   extra["Relevant ab"]   = fmtFull(raw.relevantDate)
  const barcodes = raw.barcodes || (raw.barcode ? [raw.barcode] : [])
  if (barcodes[0]?.format)  extra["Barcode-Format"] = barcodes[0].format
  if (barcodes[0]?.altText) extra["Barcode-Text"]   = barcodes[0].altText
  return { back, extra }
}

function BarcodeDisplay({ value }) {
  if (!value) return null
  const bars = []
  let x = 0
  for (let i = 0; i < value.length && x < 260; i++) {
    const w = (value.charCodeAt(i) % 3) + 1
    const gap = (value.charCodeAt(i) % 2) + 1
    bars.push(<rect key={i} x={x} y={0} width={w} height={48} fill="#1e293b" />)
    x += w + gap
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="260" height="48" viewBox="0 0 260 48" className="rounded">
        <rect width="260" height="48" fill="white" />
        {bars}
      </svg>
      <span className="text-[10px] font-mono text-slate-500 tracking-widest truncate max-w-[260px]">
        {value.length > 32 ? value.slice(0, 32) + "…" : value}
      </span>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconClose   = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
const IconTrash   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
const IconUpload  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
const IconQr      = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2}/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2}/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4-2v4h2v-4h-2z"/></svg>
const IconDots    = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
const IconPlane   = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
const IconBack    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
const IconPlus    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [error, setError] = useState(null)
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
        const jsQR = await loadJsQR()
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
            const img = ctx.getImageData(0, 0, c.width, c.height)
            const code = jsQR(img.data, c.width, c.height)
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
            {!scanning && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-2 text-slate-400">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
              <span className="text-sm">Kamera startet…</span>
            </div>}
          </div>
      }
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-slate-400 text-center">QR-Code auf Buchungsbestätigung halten</p>
      <button onClick={() => { stopCamera(); onClose() }} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">Abbrechen</button>
    </div>
  )
}

// ─── Add Pass Modal (triggered from Nav) ─────────────────────────────────────
function AddPassModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState("upload")
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [urlInput, setUrlInput] = useState("")
  const [showQr, setShowQr] = useState(false)
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
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"><IconClose /></button>
        </div>

        {!showQr && (
          <div className="flex px-5 pt-4 gap-2">
            {[{ id: "upload", label: "Datei", icon: <IconUpload /> }, { id: "qr", label: "QR-Code", icon: <IconQr /> }, { id: "url", label: "URL" }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(null) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>
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
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-10 ${dragging ? "border-sky-400 bg-sky-400/5" : "border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800/60"}`}>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400"><IconUpload /></div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">{dragging ? "Loslassen…" : ".pkpass Datei hierher ziehen"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">oder tippen zum Auswählen</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pkpass,application/vnd.apple.pkpass" className="hidden" onChange={e => uploadFile(e.target.files[0])} />
              </div>
              {loading && <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400"><div className="w-4 h-4 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />Wird verarbeitet…</div>}
            </>
          )}

          {tab === "qr" && !showQr && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-20 h-20 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.5}/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.5}/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.5}/></svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">QR-Code scannen</p>
                <p className="text-xs text-slate-500 mt-1">Scanne den QR-Code auf deiner Buchungsbestätigung</p>
              </div>
              <button onClick={() => setShowQr(true)} className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"><IconQr />Kamera öffnen</button>
            </div>
          )}

          {tab === "qr" && showQr && <QrScanner onResult={onQrResult} onClose={() => setShowQr(false)} />}

          {tab === "url" && !showQr && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Pass-URL</label>
                <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && importUrl()}
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

// ─── Pass Detail Overlay ──────────────────────────────────────────────────────
function PassDetailOverlay({ pass, onClose, onDelete }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { back, extra } = extractPassDetails(pass.raw_data)
  const hasDetails = back.length > 0 || Object.keys(extra).length > 0 || !!pass.barcode

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>

      {/* Pass card + sidebar wrapper */}
      <div className="flex w-full sm:w-auto items-end sm:items-center justify-center sm:justify-center gap-0 sm:gap-4 px-0 sm:px-4">

        {/* ── The boarding pass card ── */}
        <div className="w-full sm:w-[360px] bg-slate-950 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button onClick={onClose}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors text-sm">
              <IconBack /><span>Zurück</span>
            </button>
            <div className="flex items-center gap-1">
              {hasDetails && (
                <button onClick={() => setSidebarOpen(o => !o)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidebarOpen ? "bg-sky-500/20 text-sky-400" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}>
                  <IconDots />
                </button>
              )}
              <button onClick={() => { if (window.confirm("Pass wirklich löschen?")) { onDelete(pass.id); onClose() } }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <IconTrash />
              </button>
            </div>
          </div>

          {/* Scrollable ticket body */}
          <div className="overflow-y-auto flex-1 px-4 pb-8">
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl">
              {/* Airline header */}
              <div className="bg-gradient-to-br from-sky-600 to-blue-700 px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sky-200 text-[10px] font-bold uppercase tracking-widest">Boarding Pass</p>
                    <p className="text-white font-bold text-xl leading-tight mt-1">{pass.airline || "–"}</p>
                  </div>
                  {pass.flight_number && (
                    <div className="text-right bg-white/10 rounded-xl px-3 py-2">
                      <p className="text-sky-200 text-[9px] uppercase tracking-widest">Flug</p>
                      <p className="text-white font-mono font-black text-2xl leading-none mt-0.5">{pass.flight_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="text-center flex-1">
                    <p className="font-mono font-black text-5xl text-slate-900 leading-none tracking-tight">{pass.origin || "???"}</p>
                    {pass.departure_time && <p className="text-slate-400 text-xs mt-2 font-mono">{fmtTime(pass.departure_time)}</p>}
                  </div>
                  <div className="flex flex-col items-center gap-1 px-1">
                    <svg className="w-28 h-5 text-slate-300" viewBox="0 0 112 20" fill="none">
                      <line x1="0" y1="10" x2="96" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
                      <path d="M98 6l8 4-8 4V6z" fill="currentColor"/>
                    </svg>
                    {pass.departure_time && <p className="text-[10px] text-slate-400 whitespace-nowrap">{fmtDate(pass.departure_time)}</p>}
                  </div>
                  <div className="text-center flex-1">
                    <p className="font-mono font-black text-5xl text-slate-900 leading-none tracking-tight">{pass.destination || "???"}</p>
                    {pass.arrival_time && <p className="text-slate-400 text-xs mt-2 font-mono">{fmtTime(pass.arrival_time)}</p>}
                  </div>
                </div>
              </div>

              {/* Tear line */}
              <div className="relative flex items-center my-1">
                <div className="absolute -left-4 w-7 h-7 rounded-full bg-slate-950" />
                <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-4" />
                <div className="absolute -right-4 w-7 h-7 rounded-full bg-slate-950" />
              </div>

              {/* Details grid */}
              <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { label: "Passagier",    value: pass.passenger_name },
                  { label: "Sitz",         value: pass.seat },
                  { label: "Buchungs-Nr.", value: pass.booking_reference },
                  { label: "Ankunft",      value: pass.arrival_time ? fmtDate(pass.arrival_time) : null },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{label}</p>
                    <p className="text-slate-900 font-bold text-sm mt-0.5 font-mono">{value}</p>
                  </div>
                ))}
              </div>

              {/* Barcode */}
              {pass.barcode && (
                <div className="px-6 pb-6">
                  <div className="w-full border-t border-slate-100 mb-4" />
                  <BarcodeDisplay value={pass.barcode} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Detail sidebar: right on desktop, bottom sheet on mobile ── */}
        {sidebarOpen && (
          <>
            {/* Mobile backdrop */}
            <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setSidebarOpen(false)} />

            {/* Sidebar panel */}
            <div className={`
              fixed sm:static z-50
              bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto
              w-full sm:w-80
              bg-slate-900 border border-slate-800
              rounded-t-2xl sm:rounded-2xl
              shadow-2xl overflow-hidden
              flex flex-col
              max-h-[60vh] sm:max-h-[80vh]
            `}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                <h3 className="text-sm font-semibold text-slate-100">Weitere Details</h3>
                <button onClick={() => setSidebarOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                  <IconClose />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                {back.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Pass-Informationen</p>
                    <div className="space-y-2">
                      {back.map((field, i) => (
                        <div key={i} className="bg-slate-800/60 rounded-xl px-4 py-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">{field.label || field.key}</p>
                          <p className="text-sm text-slate-200 mt-0.5 leading-relaxed">{String(field.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(extra).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Metadaten</p>
                    <div className="space-y-0">
                      {Object.entries(extra).map(([k, v]) => (
                        <div key={k} className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-800 last:border-0">
                          <span className="text-xs text-slate-500 shrink-0">{k}</span>
                          <span className="text-xs text-slate-300 font-mono text-right break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pass.barcode && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Barcode-Rohdaten</p>
                    <div className="bg-slate-800/60 rounded-xl px-4 py-3">
                      <p className="text-xs font-mono text-slate-400 break-all leading-relaxed">{pass.barcode}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Compact Grid Card ────────────────────────────────────────────────────────
function PassGridCard({ pass, onClick }) {
  const isPast = pass.departure_time && new Date(pass.departure_time) < new Date()
  return (
    <button onClick={onClick}
      className={`group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200
        hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.99]
        ${isPast ? "opacity-50 hover:opacity-80" : ""}`}>

      {/* White ticket background */}
      <div className="bg-white">
        {/* Colored top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />

        <div className="px-4 pt-3 pb-0">
          {/* Route – big IATA codes */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono font-black text-[28px] text-slate-900 leading-none tracking-tighter">
              {pass.origin || "???"}
            </span>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <svg className="w-full h-3 text-slate-300" viewBox="0 0 60 12" fill="none">
                <line x1="0" y1="6" x2="50" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
                <path d="M52 3l6 3-6 3V3z" fill="currentColor"/>
              </svg>
            </div>
            <span className="font-mono font-black text-[28px] text-slate-900 leading-none tracking-tighter">
              {pass.destination || "???"}
            </span>
          </div>

          {/* Airline + flight + seat */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-700 leading-tight">{pass.airline || "Unbekannte Airline"}</p>
              {pass.flight_number && <p className="text-[11px] font-mono text-slate-400 mt-0.5">{pass.flight_number}</p>}
            </div>
            {pass.seat && (
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Sitz</p>
                <p className="text-sm font-mono font-black text-slate-800">{pass.seat}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tear line with half-circles */}
        <div className="relative flex items-center my-0">
          <div className="absolute -left-2 w-4 h-4 rounded-full bg-slate-950" />
          <div className="flex-1 border-t border-dashed border-slate-200 mx-3" />
          <div className="absolute -right-2 w-4 h-4 rounded-full bg-slate-950" />
        </div>

        {/* Date strip */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {pass.departure_time ? fmtDate(pass.departure_time) : "Kein Datum"}
          </span>
          {pass.departure_time && (
            <span className="text-[11px] font-mono font-semibold text-slate-600">{fmtTime(pass.departure_time)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center px-8">
      <div className="relative">
        {/* Stacked card effect */}
        <div className="absolute inset-0 bg-white rounded-2xl rotate-6 scale-95 opacity-20" />
        <div className="absolute inset-0 bg-white rounded-2xl rotate-3 scale-97 opacity-40" />
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-slate-400 relative shadow-lg">
          <IconPlane />
        </div>
      </div>
      <div>
        <p className="text-slate-300 font-semibold text-lg">Keine Pässe vorhanden</p>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          Importiere deinen ersten Boarding Pass über<br />
          <span className="text-slate-500">„+ Add Card"</span> in der Navigationsleiste.
        </p>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors shadow-lg shadow-sky-500/20">
        <IconPlus />
        Ersten Pass hinzufügen
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Passes({ add }) {
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(!!add)
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

  // Open modal when navigated to /passes/add
  useEffect(() => { if (add) setShowModal(true) }, [add])

  const handleSuccess = (newPass) => {
    setPasses(prev => [newPass, ...prev])
    setShowModal(false)
    navigate("/passes", { replace: true })
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/passes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setPasses(prev => prev.filter(p => p.id !== id))
        setSelectedPass(null)
      }
    } catch { }
  }

  const closeModal = () => {
    setShowModal(false)
    navigate("/passes", { replace: true })
  }

  const openAdd = () => {
    setShowModal(true)
    navigate("/passes/add", { replace: true })
  }

  const upcoming = passes.filter(p => !p.departure_time || new Date(p.departure_time) >= new Date())
  const past     = passes.filter(p => p.departure_time && new Date(p.departure_time) < new Date())

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-100">Meine Pässe</h1>
          {!loading && passes.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {passes.length} Pass{passes.length !== 1 ? "e" : ""}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-sky-400 rounded-full animate-spin mr-3" />
            Lädt…
          </div>
        )}

        {/* Empty state */}
        {!loading && passes.length === 0 && <EmptyState onAdd={openAdd} />}

        {/* Upcoming */}
        {!loading && upcoming.length > 0 && (
          <section className="mb-8">
            {past.length > 0 && (
              <p className="text-[11px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Bevorstehend</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcoming.map(p => (
                <PassGridCard key={p.id} pass={p} onClick={() => setSelectedPass(p)} />
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {!loading && past.length > 0 && (
          <section>
            <p className="text-[11px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Vergangene Flüge</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {past.map(p => (
                <PassGridCard key={p.id} pass={p} onClick={() => setSelectedPass(p)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Detail overlay */}
      {selectedPass && (
        <PassDetailOverlay
          pass={selectedPass}
          onClose={() => setSelectedPass(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Add pass modal (from Nav "Add Card" or empty state button) */}
      {showModal && <AddPassModal onClose={closeModal} onSuccess={handleSuccess} />}
    </div>
  )
}