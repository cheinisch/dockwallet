import { useState } from "react"
import BarcodeDisplay from "./BarcodeDisplay.jsx"
import { fmtDate, fmtTime, extractPassDetails, IconBack, IconDots, IconTrash, IconClose } from "./passUtils.js"

/**
 * Vollbild-Overlay mit realistischer Ticket-Darstellung.
 * Oben rechts: ⋮-Button öffnet Sidebar/Bottom-Sheet mit Details + Signatur-Status.
 *
 * Props:
 *   pass     – Pass-Objekt aus der API
 *   onClose  – Schließt das Overlay
 *   onDelete – Löscht den Pass (id)
 */
export default function PassDetailOverlay({ pass, onClose, onDelete }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { back, extra } = extractPassDetails(pass.raw_data)

  const isVoided  = pass.is_voided || (pass.expiration_date && new Date(pass.expiration_date) < new Date())
  const bgStyle   = pass.color_background
    ? { background: `linear-gradient(135deg, ${pass.color_background}, ${pass.color_background}cc)` }
    : { background: "linear-gradient(135deg, #0284c7, #1d4ed8)" }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full sm:w-auto items-end sm:items-center justify-center gap-0 sm:gap-4 px-0 sm:px-4">

        {/* ── Ticket-Karte ── */}
        <div className="w-full sm:w-[360px] bg-slate-950 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">

          {/* Top-Bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button onClick={onClose}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors text-sm">
              <IconBack /><span>Zurück</span>
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => setSidebarOpen(o => !o)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  sidebarOpen ? "bg-sky-500/20 text-sky-400" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                }`}>
                <IconDots />
              </button>
              <button
                onClick={() => { if (window.confirm("Pass wirklich löschen?")) { onDelete(pass.id); onClose() } }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <IconTrash />
              </button>
            </div>
          </div>

          {/* Ticket-Inhalt */}
          <div className="overflow-y-auto flex-1 px-4 pb-8">
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl">

              {/* Abgelaufen-Banner */}
              {isVoided && (
                <div className="bg-red-500 px-4 py-2 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                  </svg>
                  <p className="text-white text-xs font-semibold">
                    {pass.is_voided ? "Dieser Pass wurde entwertet" : `Abgelaufen am ${fmtDate(pass.expiration_date)}`}
                  </p>
                </div>
              )}

              {/* Header mit Pass-Farbe */}
              <div className="px-6 py-5" style={bgStyle}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: pass.color_label ? pass.color_label + "cc" : "rgba(186,230,253,1)" }}>
                      {pass.flight_number ? "Boarding Pass" : "Pass"}
                    </p>
                    <p className="font-bold text-xl leading-tight mt-1"
                      style={{ color: pass.color_foreground || "#ffffff" }}>
                      {pass.logo_text || pass.airline || "–"}
                    </p>
                  </div>
                  {pass.flight_number && (
                    <div className="text-right rounded-xl px-3 py-2"
                      style={{ backgroundColor: pass.color_foreground ? pass.color_foreground + "22" : "rgba(255,255,255,0.15)" }}>
                      <p className="text-[9px] uppercase tracking-widest"
                        style={{ color: pass.color_label ? pass.color_label + "aa" : "rgba(186,230,253,1)" }}>Flug</p>
                      <p className="font-mono font-black text-2xl leading-none mt-0.5"
                        style={{ color: pass.color_foreground || "#ffffff" }}>{pass.flight_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Route (Boarding Pass) oder Name (Generic) */}
              {pass.origin || pass.destination ? (
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-center flex-1">
                      <p className="font-mono font-black text-5xl text-slate-900 leading-none tracking-tight">
                        {pass.origin || "???"}
                      </p>
                      {pass.departure_time && (
                        <p className="text-slate-400 text-xs mt-2 font-mono">{fmtTime(pass.departure_time)}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1 px-1">
                      <svg className="w-28 h-5 text-slate-300" viewBox="0 0 112 20" fill="none">
                        <line x1="0" y1="10" x2="96" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
                        <path d="M98 6l8 4-8 4V6z" fill="currentColor"/>
                      </svg>
                      {pass.departure_time && (
                        <p className="text-[10px] text-slate-400 whitespace-nowrap">{fmtDate(pass.departure_time)}</p>
                      )}
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-mono font-black text-5xl text-slate-900 leading-none tracking-tight">
                        {pass.destination || "???"}
                      </p>
                      {pass.arrival_time && (
                        <p className="text-slate-400 text-xs mt-2 font-mono">{fmtTime(pass.arrival_time)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 pt-5 pb-4">
                  {pass.passenger_name && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Name</p>
                      <p className="font-bold text-2xl text-slate-900">{pass.passenger_name}</p>
                    </div>
                  )}
                  {pass.subtitle && (
                    <p className="text-sm text-slate-500 mt-2">{pass.subtitle}</p>
                  )}
                </div>
              )}

              {/* Perforations-Trennlinie */}
              <div className="relative flex items-center my-1">
                <div className="absolute -left-4 w-7 h-7 rounded-full bg-slate-950" />
                <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-4" />
                <div className="absolute -right-4 w-7 h-7 rounded-full bg-slate-950" />
              </div>

              {/* Detail-Grid */}
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
                  <BarcodeDisplay value={pass.barcode} raw={pass.raw_data} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar / Bottom-Sheet ── */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed sm:static z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto
              w-full sm:w-80 bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl
              shadow-2xl overflow-hidden flex flex-col max-h-[60vh] sm:max-h-[80vh]">

              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                <h3 className="text-sm font-semibold text-slate-100">Weitere Details</h3>
                <button onClick={() => setSidebarOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                  <IconClose />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

                {/* Signatur-Status */}
                <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                  pass.signature_valid
                    ? "bg-emerald-950/60 border border-emerald-800/50"
                    : "bg-amber-950/60 border border-amber-800/50"
                }`}>
                  <div className={`mt-0.5 shrink-0 ${pass.signature_valid ? "text-emerald-400" : "text-amber-400"}`}>
                    {pass.signature_valid ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${pass.signature_valid ? "text-emerald-300" : "text-amber-300"}`}>
                      {pass.signature_valid ? "Signatur gültig" : "Signatur ungültig"}
                    </p>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${pass.signature_valid ? "text-emerald-500" : "text-amber-600"}`}>
                      {pass.signature_reason || "Keine Details verfügbar"}
                    </p>
                  </div>
                </div>

                {/* Back Fields */}
                {back.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Pass-Informationen</p>
                    <div className="space-y-2">
                      {back.map((field, i) => (
                        <div key={i} className="bg-slate-800/60 rounded-xl px-4 py-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                            {field.label || field.key}
                          </p>
                          <p className="text-sm text-slate-200 mt-0.5 leading-relaxed">{String(field.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadaten */}
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

                {/* Barcode-Rohdaten */}
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