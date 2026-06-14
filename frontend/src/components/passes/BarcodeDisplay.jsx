import { useState, useEffect, useRef, useCallback } from "react"

/**
 * Rendert einen Barcode.
 * QR / Aztec  → echter QR-Code via qrcode-CDN
 * PDF417 / Code128 / andere → SVG-Balken
 *
 * Props:
 *   value   – Barcode-Nachricht (maschinenlesbarer Wert)
 *   altText – Anzeigetext (z.B. Buchungscode, aus pkpass altText)
 *   raw     – pass.raw_data (Objekt oder JSON-String, für Format-Erkennung)
 */
export default function BarcodeDisplay({ value, altText, raw }) {
  const canvasRef = useRef(null)
  const [status, setStatus] = useState("loading") // loading | done | error
  const [errorMsg, setErrorMsg] = useState(null)

  // raw_data kann als String aus der DB kommen
  const rawObj = typeof raw === "string"
    ? (() => { try { return JSON.parse(raw) } catch { return null } })()
    : raw

  const barcodeData = rawObj?.barcodes?.[0] || rawObj?.barcode || null
  const format   = barcodeData?.format || "PKBarcodeFormatQR"
  const displayText = altText || barcodeData?.altText || value || ""
  const isQR     = format === "PKBarcodeFormatQR"
  const isAztec  = format === "PKBarcodeFormatAztec"
  const isPDF417 = format === "PKBarcodeFormatPDF417"

  const renderQR = useCallback(async (canvas) => {
    try {
      if (!window.QRCode) {
        await new Promise((res, rej) => {
          // Prüfen ob Script schon lädt
          const existing = document.querySelector('script[src*="qrcode"]')
          if (existing) {
            existing.addEventListener("load", res)
            existing.addEventListener("error", rej)
            return
          }
          const s = document.createElement("script")
          s.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"
          s.onload = res
          s.onerror = () => rej(new Error("QRCode-Bibliothek konnte nicht geladen werden"))
          document.head.appendChild(s)
        })
      }
      await window.QRCode.toCanvas(canvas, value, {
        width: 200,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
      setStatus("done")
    } catch (e) {
      setErrorMsg(e.message)
      setStatus("error")
    }
  }, [value])

  useEffect(() => {
    if (!value || (!isQR && !isAztec)) { setStatus("done"); return }
    setStatus("loading")

    // Canvas braucht einen Frame um im DOM zu sein
    const timer = setTimeout(() => {
      const canvas = canvasRef.current
      if (canvas) renderQR(canvas)
      else setStatus("error")
    }, 50)
    return () => clearTimeout(timer)
  }, [value, isQR, isAztec, renderQR])

  if (!value) return null

  // ── QR / Aztec ──────────────────────────────────────────────────────────────
  if (isQR || isAztec) {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="relative rounded-xl overflow-hidden"
          style={{ width: 208, height: 208, background: "#ffffff", padding: 4, border: "1px solid #e2e8f0" }}>
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-1 px-3 text-center">
              <p className="text-xs text-red-500">QR-Code konnte nicht gerendert werden</p>
              {errorMsg && <p className="text-[10px] text-slate-400">{errorMsg}</p>}
            </div>
          )}
          <canvas ref={canvasRef} className="block rounded-lg" style={{ maxWidth: "100%" }} />
        </div>
        {/* Anzeigetext: altText bevorzugt (z.B. NCW5JD), nicht der rohe Barcode-Wert */}
        <span className="text-sm font-mono font-semibold text-slate-600 tracking-widest">
          {displayText}
        </span>
        <span className="text-[9px] text-slate-400 uppercase tracking-widest">
          {format.replace("PKBarcodeFormat", "")}
        </span>
      </div>
    )
  }

  // ── PDF417 / Code128 / andere → SVG-Balken ──────────────────────────────────
  const bars = []
  let x = 4
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  for (let i = 0; i < value.length && x < 252; i++) {
    const ch  = value.charCodeAt(i)
    const w   = (ch % 3) + 1
    const gap = ((ch ^ (seed >> 2)) % 3) + 1
    bars.push(<rect key={i} x={x} y={4} width={w} height={isPDF417 ? 48 : 56} fill="#0f172a" rx={0.5} />)
    x += w + gap
  }
  const h = isPDF417 ? 56 : 64

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="bg-white rounded-xl p-3 w-full" style={{ border: "1px solid #e2e8f0" }}>
        <svg width="100%" height={h} viewBox={`0 0 260 ${h}`} preserveAspectRatio="xMidYMid meet">
          <rect width="260" height={h} fill="white" />
          {bars}
        </svg>
      </div>
      <span className="text-sm font-mono font-semibold text-slate-600 tracking-widest">
        {displayText}
      </span>
      <span className="text-[9px] text-slate-400 uppercase tracking-widest">
        {format.replace("PKBarcodeFormat", "")}
      </span>
    </div>
  )
}