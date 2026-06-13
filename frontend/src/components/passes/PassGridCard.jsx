import { fmtDate, fmtTime } from "./passUtils.jsx"

/**
 * Kompakte Ticket-Karte für die Rasteransicht.
 * Zeigt Boarding-Pass-Route (IATA) oder generischen Pass (Name/Subtitle).
 * Passt Farben automatisch aus pass.json an.
 *
 * Props:
 *   pass    – Pass-Objekt aus der API
 *   onClick – Callback beim Klick
 */
export default function PassGridCard({ pass, onClick }) {
  const isPast   = pass.departure_time && new Date(pass.departure_time) < new Date()
  const isVoided = pass.is_voided || (pass.expiration_date && new Date(pass.expiration_date) < new Date())
  const bg  = pass.color_background || null
  const fg  = pass.color_foreground || null
  const lbl = pass.color_label      || null
  const hasColor = !!bg

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200
        hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.99]
        ${(isPast || isVoided) ? "opacity-60 hover:opacity-90" : ""}`}
    >
      {/* Abgelaufen-Badge */}
      {isVoided && (
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-500/90 text-white">
          Abgelaufen
        </div>
      )}

      {/* Karteninhalt */}
      <div style={hasColor ? { backgroundColor: bg } : {}} className={hasColor ? "" : "bg-white"}>

        {/* Farbstreifen oben */}
        {hasColor
          ? <div className="h-1 w-full" style={{ backgroundColor: fg ? fg + "33" : "rgba(255,255,255,0.2)" }} />
          : <div className="h-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
        }

        <div className="px-4 pt-3 pb-0">
          {pass.origin || pass.destination ? (
            /* ── Boarding Pass: IATA-Route ── */
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-black text-[28px] leading-none tracking-tighter"
                style={{ color: fg || (hasColor ? "#ffffff" : "#0f172a") }}>
                {pass.origin || "???"}
              </span>
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <svg className="w-full h-3" viewBox="0 0 60 12" fill="none"
                  style={{ color: fg ? fg + "66" : (hasColor ? "rgba(255,255,255,0.4)" : "#cbd5e1") }}>
                  <line x1="0" y1="6" x2="50" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
                  <path d="M52 3l6 3-6 3V3z" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-mono font-black text-[28px] leading-none tracking-tighter"
                style={{ color: fg || (hasColor ? "#ffffff" : "#0f172a") }}>
                {pass.destination || "???"}
              </span>
            </div>
          ) : (
            /* ── Generischer Pass: Name + Subtitle ── */
            <div className="mb-3">
              <p className="font-bold text-lg leading-tight"
                style={{ color: fg || (hasColor ? "#ffffff" : "#0f172a") }}>
                {pass.passenger_name || pass.logo_text || pass.description || "–"}
              </p>
              {(pass.subtitle || (pass.passenger_name && pass.logo_text)) && (
                <p className="text-xs mt-0.5 leading-snug"
                  style={{ color: lbl ? lbl + "aa" : (hasColor ? "rgba(255,255,255,0.6)" : "#64748b") }}>
                  {pass.subtitle || pass.logo_text}
                </p>
              )}
            </div>
          )}

          {/* Airline / Flug / Sitz */}
          <div className="flex items-end justify-between mb-3">
            <div>
              {(pass.origin || pass.destination) && (
                <p className="text-xs font-semibold leading-tight"
                  style={{ color: lbl || (hasColor ? "rgba(255,255,255,0.85)" : "#334155") }}>
                  {pass.logo_text || pass.airline || "Unbekannte Airline"}
                </p>
              )}
              {pass.flight_number && (
                <p className="text-[11px] font-mono mt-0.5"
                  style={{ color: lbl ? lbl + "aa" : (hasColor ? "rgba(255,255,255,0.5)" : "#94a3b8") }}>
                  {pass.flight_number}
                </p>
              )}
            </div>
            {pass.seat && (
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider"
                  style={{ color: lbl ? lbl + "88" : (hasColor ? "rgba(255,255,255,0.5)" : "#94a3b8") }}>Sitz</p>
                <p className="text-sm font-mono font-black"
                  style={{ color: fg || (hasColor ? "#ffffff" : "#1e293b") }}>{pass.seat}</p>
              </div>
            )}
          </div>
        </div>

        {/* Perforations-Trennlinie */}
        <div className="relative flex items-center my-0">
          <div className="absolute -left-2 w-4 h-4 rounded-full bg-slate-950" />
          <div className="flex-1 mx-3"
            style={{ borderTop: `1px dashed ${fg ? fg + "44" : (hasColor ? "rgba(255,255,255,0.2)" : "#e2e8f0")}` }} />
          <div className="absolute -right-2 w-4 h-4 rounded-full bg-slate-950" />
        </div>

        {/* Datum-Strip */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px]"
            style={{ color: lbl ? lbl + "99" : (hasColor ? "rgba(255,255,255,0.55)" : "#64748b") }}>
            {pass.departure_time ? fmtDate(pass.departure_time) : "Kein Datum"}
          </span>
          {pass.departure_time && (
            <span className="text-[11px] font-mono font-semibold"
              style={{ color: fg || (hasColor ? "rgba(255,255,255,0.8)" : "#475569") }}>
              {fmtTime(pass.departure_time)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}