import { useState, useEffect, useRef } from "react"

/**
 * Rendert einen Barcode aus pass.json-Daten.
 * QR / Aztec  → echter QR-Code via qrcode-CDN
 * PDF417 / Code128 / andere → SVG-Balken
 *
 * Props:
 *   value  – Barcode-Nachricht (String)
 *   raw    – pass.raw_data (für Format-Erkennung)
 */
export default function BarcodeDisplay({ value, raw }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)

  const format   = raw?.barcodes?.[0]?.format || raw?.barcode?.format || "PKBarcodeFormatQR"
  const isQR     = format === "PKBarcodeFormatQR"
  const isAztec  = format === "PKBarcodeFormatAztec"
  const isPDF417 = format === "PKBarcodeFormatPDF417"

  useEffect(() => {
    if (!value || (!isQR && !isAztec)) return
    const canvas = canvasRef.current
    if (!canvas) return

    const loadAndRender = async () => {
      try {
        if (!window.QRCode) {
          await new Promise((res, rej) => {
            const s = document.createElement("script")
            s.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"
            s.onload = res; s.onerror = rej
            document.head.appendChild(s)
          })
        }
        await window.QRCode.toCanvas(canvas, value, {
          width: 200,
          margin: 2,
          color: { dark: "#1e293b", light: "#ffffff" },
          errorCorrectionLevel: "M",
        })
      } catch (e) {
        setError(e.message)
      }
    }
    loadAndRender()
  }, [value, isQR, isAztec])

  if (!value) return null

  if (isQR || isAztec) {
    return (
      <div className="flex flex-col items-center gap-2">
        {error
          ? <p className="text-xs text-red-400">{error}</p>
          : <canvas ref={canvasRef} className="rounded-lg" style={{ width: 160, height: 160 }} />
        }
        <span className="text-[10px] font-mono text-slate-500 tracking-wider text-center break-all max-w-[200px]">
          {value.length > 40 ? value.slice(0, 40) + "…" : value}
        </span>
        <span className="text-[9px] text-slate-600 uppercase tracking-widest">
          {format.replace("PKBarcodeFormat", "")}
        </span>
      </div>
    )
  }

  // PDF417 / Code128 / andere → SVG-Balken
  const bars = []
  let x = 4
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  for (let i = 0; i < value.length && x < 252; i++) {
    const ch  = value.charCodeAt(i)
    const w   = (ch % 3) + 1
    const gap = ((ch ^ (seed >> 2)) % 3) + 1
    bars.push(<rect key={i} x={x} y={4} width={w} height={isPDF417 ? 48 : 56} fill="#1e293b" rx={0.5} />)
    x += w + gap
  }

  const h = isPDF417 ? 56 : 64
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white rounded-lg p-2">
        <svg width="260" height={h} viewBox={`0 0 260 ${h}`}>
          <rect width="260" height={h} fill="white" />
          {bars}
        </svg>
      </div>
      <span className="text-[10px] font-mono text-slate-500 tracking-wider text-center break-all max-w-[260px]">
        {value.length > 40 ? value.slice(0, 40) + "…" : value}
      </span>
      <span className="text-[9px] text-slate-600 uppercase tracking-widest">
        {format.replace("PKBarcodeFormat", "")}
      </span>
    </div>
  )
}