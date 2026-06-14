import { useState, useEffect, useRef, useCallback } from "react"
import QRCode from "qrcode"
import bwipjs from "bwip-js"

/**
 * Rendert einen Barcode – alle Formate aus pkpass.
 * QR / Aztec   → qrcode (npm)
 * PDF417       → bwip-js (npm)
 * Code128 etc. → bwip-js (npm)
 *
 * Props:
 *   value   – maschinenlesbarer Barcode-Wert
 *   altText – Anzeigetext (z.B. NCW5JD, W000000002250861)
 *   raw     – pass.raw_data für Format-Erkennung
 */
export default function BarcodeDisplay({ value, altText, raw }) {
  const canvasRef              = useRef(null)
  const [status, setStatus]    = useState("loading")
  const [errorMsg, setErrorMsg] = useState(null)

  const rawObj = typeof raw === "string"
    ? (() => { try { return JSON.parse(raw) } catch { return null } })()
    : raw

  const barcodeData = rawObj?.barcodes?.[0] || rawObj?.barcode || null
  const format      = barcodeData?.format || "PKBarcodeFormatQR"
  const displayText = altText || barcodeData?.altText || value || ""

  const isQR     = format === "PKBarcodeFormatQR"
  const isAztec  = format === "PKBarcodeFormatAztec"
  const isPDF417 = format === "PKBarcodeFormatPDF417"
  const isCode128 = format === "PKBarcodeFormatCode128"

  // bwip-js Barcode-Typ Mapping
  const bwipType = isPDF417 ? "pdf417" : isCode128 ? "code128" : isAztec ? "azteccode" : null

  const renderWithBwip = useCallback((canvas) => {
    try {
      bwipjs.toCanvas(canvas, {
        bcid:        bwipType,
        text:        value,
        scale:       3,
        height:      isPDF417 ? 20 : 10,
        includetext: false,
      })
      setStatus("done")
    } catch (e) {
      setErrorMsg(e.message)
      setStatus("error")
    }
  }, [value, bwipType, isPDF417])

  const renderQR = useCallback(async (canvas) => {
    try {
      await QRCode.toCanvas(canvas, value, {
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
    if (!value) { setStatus("done"); return }
    setStatus("loading")
    setErrorMsg(null)
    const timer = setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) { setErrorMsg("Canvas nicht verfügbar"); setStatus("error"); return }
      if (isQR) renderQR(canvas)
      else if (bwipType) renderWithBwip(canvas)
      else setStatus("done")
    }, 50)
    return () => clearTimeout(timer)
  }, [value, isQR, bwipType, renderQR, renderWithBwip])

  if (!value) return null

  const needsCanvas = isQR || isAztec || isPDF417 || isCode128

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {needsCanvas ? (
        <div className="relative rounded-xl overflow-hidden w-full flex justify-center"
          style={{ background: "#ffffff", padding: 8, border: "1px solid #e2e8f0", minHeight: 80 }}>
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-1 px-3 text-center">
              <p className="text-xs text-red-500">Barcode konnte nicht gerendert werden</p>
              {errorMsg && <p className="text-[10px] text-slate-400">{errorMsg}</p>}
            </div>
          )}
          <canvas ref={canvasRef} className="block max-w-full" />
        </div>
      ) : (
        // Unbekanntes Format → Text-Fallback
        <div className="bg-white rounded-xl p-4 w-full text-center border border-slate-200">
          <p className="font-mono text-slate-700 text-sm break-all">{value}</p>
        </div>
      )}

      <span className="text-sm font-mono font-semibold text-slate-600 tracking-widest">
        {displayText}
      </span>
      <span className="text-[9px] text-slate-400 uppercase tracking-widest">
        {format.replace("PKBarcodeFormat", "")}
      </span>
    </div>
  )
}