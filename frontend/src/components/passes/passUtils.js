// ─── Datum-Formatter ──────────────────────────────────────────────────────────
const fmt = (iso, opts) => {
  if (!iso) return "–"
  return new Intl.DateTimeFormat("de-DE", opts).format(new Date(iso))
}
export const fmtDate = (iso) => fmt(iso, { day: "2-digit", month: "short", year: "numeric" })
export const fmtTime = (iso) => fmt(iso, { hour: "2-digit", minute: "2-digit" })
export const fmtFull = (iso) => fmt(iso, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

// ─── Pass-Details aus raw_data extrahieren ────────────────────────────────────
export function extractPassDetails(raw) {
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

// ─── Icons ────────────────────────────────────────────────────────────────────
export const IconClose  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
export const IconTrash  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
export const IconUpload = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
export const IconQr     = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2}/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2}/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4-2v4h2v-4h-2z"/></svg>
export const IconDots   = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
export const IconPlane  = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
export const IconBack   = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
export const IconPlus   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>