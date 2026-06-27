import { fmtDate, fmtTime } from "./passUtils.jsx"

/**
 * Kompakte Ticket-Karte für die Rasteransicht.
 * Props:
 *   pass          – Pass-Objekt aus der API
 *   onClick       – Callback beim Klick auf die Karte
 *   onFavorite    – Callback beim Klick auf den Stern (pass, newValue)
 *   favoriteLoading – Boolean, ob Favorit gerade gespeichert wird
 */
export default function PassGridCard({ pass, onClick, onFavorite, favoriteLoading }) {
  const isPast   = pass.departure_time && new Date(pass.departure_time) < new Date()
  const raw      = pass.raw_data
    ? (typeof pass.raw_data === "string"
        ? (() => { try { return JSON.parse(pass.raw_data) } catch { return null } })()
        : pass.raw_data)
    : null
  const isVoided = pass.is_voided || raw?.voided === true
    || (pass.expiration_date && new Date(pass.expiration_date) < new Date())
    || (raw?.expirationDate && new Date(raw.expirationDate) < new Date())
  const bg       = pass.color_background || null
  const fg       = pass.color_foreground || null
  const lbl      = pass.color_label      || null
  const hasColor = !!bg
  const isLight  = bg === "#ffffff" || bg === "#ffffffff"

  const textFg  = isLight ? "#111827" : (fg || (hasColor ? "#ffffff" : "#0f172a"))
  const textLbl = isLight ? "#6b7280" : (lbl ? lbl + "aa" : (hasColor ? "rgba(255,255,255,0.6)" : "#64748b"))
  const dividerColor = isLight ? "#e5e7eb" : (fg ? fg + "44" : (hasColor ? "rgba(255,255,255,0.2)" : "#e2e8f0"))
  const holeColor = isLight ? "#0f172a" : "var(--color-slate-950, #020617)"

  const isBoardingPass = !!(pass.origin || pass.destination)

  const title = isBoardingPass
    ? null
    : (pass.passenger_name || pass.logo_text?.trim() || pass.description || pass.airline || "–")

  const subtitle = pass.subtitle && pass.subtitle !== title ? pass.subtitle : null

  const isFav = pass.is_favorite

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    if (!favoriteLoading && onFavorite) {
      onFavorite(pass, !isFav)
    }
  }

  // Sternfarbe: auf hellem Hintergrund gold/grau, auf dunklem weiß/transparent
  const starActiveColor = isLight ? "#f59e0b" : "#fbbf24"
  const starInactiveColor = isLight ? "#d1d5db" : "rgba(255,255,255,0.25)"

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

      {/* Favorit-Button (Stern) */}
      {!isVoided && (
        <button
          onClick={handleFavoriteClick}
          aria-label={isFav ? "Favorit entfernen" : "Als Favorit markieren"}
          className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150
            ${favoriteLoading ? "opacity-50 cursor-wait" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}
            ${isFav ? "!opacity-100" : ""}`}
          style={{ backgroundColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.25)" }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 transition-transform duration-150 active:scale-125"
            fill={isFav ? starActiveColor : "none"}
            stroke={isFav ? starActiveColor : starInactiveColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      )}

      <div
        style={hasColor ? { backgroundColor: bg } : {}}
        className={hasColor ? "" : "bg-white"}
      >
        {/* Farbstreifen oben */}
        {hasColor && !isLight
          ? <div className="h-1 w-full" style={{ backgroundColor: fg ? fg + "33" : "rgba(255,255,255,0.2)" }} />
          : <div className="h-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
        }

        <div className="px-4 pt-3 pb-0">
          {isBoardingPass ? (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-black text-[28px] leading-none tracking-tighter" style={{ color: textFg }}>
                {pass.origin || "???"}
              </span>
              <div className="flex-1 flex flex-col items-center">
                <svg className="w-full h-3" viewBox="0 0 60 12" fill="none" style={{ color: fg ? fg + "66" : "#cbd5e1" }}>
                  <line x1="0" y1="6" x2="50" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
                  <path d="M52 3l6 3-6 3V3z" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-mono font-black text-[28px] leading-none tracking-tighter" style={{ color: textFg }}>
                {pass.destination || "???"}
              </span>
            </div>
          ) : (
            <div className="mb-3">
              <p className="font-bold text-lg leading-tight" style={{ color: textFg }}>
                {title}
              </p>
              {subtitle && (
                <p className="text-xs mt-0.5 leading-snug truncate" style={{ color: textLbl }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {isBoardingPass && (
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs font-semibold leading-tight" style={{ color: textLbl }}>
                  {pass.logo_text?.trim() || pass.airline || "–"}
                </p>
                {pass.flight_number && (
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: textLbl }}>
                    {pass.flight_number}
                  </p>
                )}
              </div>
              {pass.seat && (
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: textLbl }}>Sitz</p>
                  <p className="text-sm font-mono font-black" style={{ color: textFg }}>{pass.seat}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Perforations-Trennlinie */}
        <div className="relative flex items-center">
          <div className="absolute -left-2 w-4 h-4 rounded-full" style={{ backgroundColor: holeColor }} />
          <div className="flex-1 mx-3" style={{ borderTop: `1px dashed ${dividerColor}` }} />
          <div className="absolute -right-2 w-4 h-4 rounded-full" style={{ backgroundColor: holeColor }} />
        </div>

        {/* Datum-Strip */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          {(() => {
            const d = pass.departure_time || pass.event_date
            const raw = pass.raw_data
              ? (typeof pass.raw_data === "string"
                  ? (() => { try { return JSON.parse(pass.raw_data) } catch { return null } })()
                  : pass.raw_data)
              : null
            const headerDateField = raw?._fields?.header?.find(f =>
              /\d{2}[.:]\d{2}/.test(String(f.value || "")) || /\d{4}/.test(String(f.label || ""))
            )
            const headerDateText = headerDateField
              ? (String(headerDateField.label || "") + " " + String(headerDateField.value || "")).trim()
              : null
            return d ? (
              <>
                <span className="text-[11px]" style={{ color: textLbl }}>{fmtDate(d)}</span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: textFg }}>{fmtTime(d)}</span>
              </>
            ) : headerDateText ? (
              <span className="text-[11px]" style={{ color: textLbl }}>{headerDateText}</span>
            ) : (
              <span className="text-[11px]" style={{ color: textLbl }}>Kein Datum</span>
            )
          })()}
        </div>
      </div>
    </button>
  )
}