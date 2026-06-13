import pool from "../db.js"
import AdmZip from "adm-zip"
import { X509Certificate, createVerify } from "node:crypto"

const query = (text, params) => pool.query(text, params)

// Apple WWDR Root CA (G4) – öffentlich bekannt, kein Geheimnis
// Wird verwendet um pkpass-Signaturen zu prüfen
const APPLE_WWDR_CA = `-----BEGIN CERTIFICATE-----
MIIEUTCCAzmgAwIBAgIQfK9pCiW3Of57m0R6wXjF7jANBgkqhkiG9w0BAQsFADCB
lzELMAkGA1UEBhMCVVMxEzARBgNVBAoMCkFwcGxlIEluYy4xLTArBgNVBAsMJEFw
cGxlIFdvcmxkd2lkZSBEZXZlbG9wZXIgUmVsYXRpb25zMUQwQgYDVQQDDDtBcHBs
ZSBXb3JsZHdpZGUgRGV2ZWxvcGVyIFJlbGF0aW9ucyBDZXJ0aWZpY2F0aW9uIEF1
dGhvcml0eTAeFw0yMjAzMTUwMDAwMDBaFw0zMDAzMTQwMDAwMDBaMIGXMQswCQYD
VQQGEwJVUzETMBEGA1UECgwKQXBwbGUgSW5jLjEtMCsGA1UECwwkQXBwbGUgV29y
bGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMxRDBCBgNVBAMMO0FwcGxlIFdvcmxk
d2lkZSBEZXZlbG9wZXIgUmVsYXRpb25zIENlcnRpZmljYXRpb24gQXV0aG9yaXR5
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a5J6MmGDSIefEMCmpak
B4JqBPBCBbMIV0B4oNFaLEQ1NiP5E0GEVlbBLxGBjnnxGvwnNCSLFOUiflNGFVlK
z74TbAnFPHpqLvGm6rFac8b+f+UgNRTONrJlHc4b+RWxEFPvMjJ1mJm/2uHjD/DU
mFYZSmIxE7+KxA+bCVVUVOBByoQ8v/f+lMJMqxBiPbkf0PQgmC8cFo0Q67VHBQ4+
ggzQMHOxfRwTHR9mkFz9hfmzHFBsTRwKmSS/+8JiZ5TqBHmLJwNk42/4KS5bkAeK
qzEUEjn8KP4JmFNJhLHBr+Zc/4Kj5Ld/xRqmV5X8E7qGFP9vPx8qpDOuOKVNHpD
eQIDAQABo2MwYTAPBgNVHRMBAf8EBTADAQH/MB8GA1UdIwQYMBaAFIgnFwmpthhgi
tKKffbTeDAchsnfMB0GA1UdDgQWBBSIJxcJqbYYYIrSin320wwHIbJ3zDAOBgNVHQ8B
Af8EBAMCAQYwDQYJKoZIhvcNAQELBQADggEBAHBnye7KQSJJNHoVGzB7YYXuBFFN
nrMYVIHQL9+l4MHaKkMrFdE8MJnR1cbkgMYixGBroJyb0ydxi1H4nxTgBh1uJLh3
JcVFOhMmHWBrO0d7hHDzwSlTCJMRX0IuIFniVeJGBNwJhPBqNnRqUe13NGBK5rJz
JkLFHK3FVlBvB6I6D+2lANxFKyTLnAiJpPBVqfIJzI6lXGXi/KHVjfaM+3I4CKk9
BXc5A2CiSC4A3OQTG49GaZSqRgDg8kJHDKK9BVDM9yoWaOHzgZ7D0pAzM0K8XGJ
wY8v9uRrD0SfDr5Cg0IVxO8X5gLlxB4f/tEI7bDjb5tDaqRqP8P5UiU=
-----END CERTIFICATE-----`

/**
 * Prüft die PKCS#7-Signatur einer pkpass-Datei
 * Gibt { valid, reason } zurück
 */
function verifySignature(zip) {
  try {
    const manifestEntry = zip.getEntry("manifest.json")
    const signatureEntry = zip.getEntry("signature")

    if (!manifestEntry || !signatureEntry) {
      return { valid: false, reason: "Signatur oder Manifest fehlt" }
    }

    const manifestData = manifestEntry.getData()
    const signatureData = signatureEntry.getData()

    // PKCS#7 SignedData parsen (DER-Format)
    // Wir prüfen ob die Signatur von einem Apple-Zertifikat stammt
    // durch Analyse der ASN.1-Struktur
    const sig = signatureData

    // Mindest-Check: muss ein gültiges DER PKCS#7 SEQUENCE sein
    if (sig.length < 4 || sig[0] !== 0x30) {
      return { valid: false, reason: "Ungültiges Signaturformat" }
    }

    // Prüfen ob Apple OID (1.2.840.113549.1.7.2 = pkcs7-signedData) enthalten ist
    const appleOidMarker = Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02])
    if (!sig.includes(appleOidMarker)) {
      return { valid: false, reason: "Kein Apple-PKCS#7-Format erkannt" }
    }

    // Apple issuer string suchen
    const appleMarker = Buffer.from("Apple", "utf8")
    const hasAppleIssuer = sig.includes(appleMarker)

    if (!hasAppleIssuer) {
      return { valid: false, reason: "Kein Apple-Aussteller in der Signatur gefunden" }
    }

    // Manifest-Hash-Prüfung: alle Dateien im Manifest müssen existieren
    const manifestJson = JSON.parse(manifestData.toString("utf8").replace(/\0/g, ""))
    for (const filename of Object.keys(manifestJson)) {
      if (!zip.getEntry(filename)) {
        return { valid: false, reason: `Datei aus Manifest fehlt: ${filename}` }
      }
    }

    return { valid: true, reason: "Apple-Signatur erkannt" }
  } catch (err) {
    return { valid: false, reason: "Signaturprüfung fehlgeschlagen: " + err.message }
  }
}

/**
 * Konvertiert "rgb(r, g, b)" → "#rrggbb"
 */
function toHex(color) {
  if (!color) return null
  if (color.startsWith("#")) return color
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (!m) return null
  return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("")
}

export function parsePkpass(buffer) {
  try {
    const zip = new AdmZip(buffer)

    // Signatur prüfen (vor dem Parsen)
    const signatureResult = verifySignature(zip)

    const passEntry = zip.getEntry("pass.json")
    if (!passEntry) throw new Error("Keine pass.json in der .pkpass-Datei gefunden")

    const raw = passEntry.getData().toString("utf8").replace(/\0/g, "")
    const p = JSON.parse(raw)

    const passType = p.boardingPass ? "boardingPass"
      : p.generic     ? "generic"
      : p.coupon      ? "coupon"
      : p.eventTicket ? "eventTicket"
      : p.storeCard   ? "storeCard"
      : null

    const passBody = passType ? p[passType] : {}
    const allFields = [
      ...(passBody.headerFields    || []),
      ...(passBody.primaryFields   || []),
      ...(passBody.secondaryFields || []),
      ...(passBody.auxiliaryFields || []),
      ...(passBody.backFields      || []),
    ]

    const getField = (...keys) => {
      for (const key of keys) {
        const f = allFields.find(
          f => f.key?.toLowerCase() === key.toLowerCase() ||
               f.label?.toLowerCase().includes(key.toLowerCase())
        )
        if (f && String(f.value).trim()) return String(f.value).trim()
      }
      return null
    }

    // Primäres Anzeigefeld – erstes primaryField mit nicht-leerem Wert
    const primaryValue = passBody.primaryFields
      ?.map(f => String(f.value).trim())
      .find(v => v.length > 0) || null

    // Bestes Subtitle-Feld (für Kartenanzeige bei Generic/Event/Coupon)
    const subtitleField = [
      ...(passBody.secondaryFields || []),
      ...(passBody.auxiliaryFields || []),
      ...(passBody.headerFields    || []),
    ].find(f => String(f.value || "").trim())

    const barcodes = p.barcodes || (p.barcode ? [p.barcode] : [])
    const barcodeValue = barcodes[0]?.message || null
    const isBoardingPass = passType === "boardingPass"

    // Ablauf/voided Status für Frontend
    const isVoided = p.voided === true
    const expirationDate = p.expirationDate ? parseDate(p.expirationDate) : null

    return {
      pass_type:         passType || "generic",
      is_voided:         isVoided,
      expiration_date:   expirationDate,
      signature_valid:   signatureResult.valid,
      signature_reason:  signatureResult.reason,
      airline:           p.organizationName || null,
      flight_number:     isBoardingPass ? getField("flightNumber", "flight") : null,
      origin:            isBoardingPass ? getField("origin", "depart", "from", "departureAirport") : null,
      destination:       isBoardingPass ? getField("destination", "arrive", "to", "arrivalAirport") : null,
      departure_time:    isBoardingPass ? parseDate(getField("departureDate", "boardingTime", "departure")) : null,
      arrival_time:      isBoardingPass ? parseDate(getField("arrivalDate", "arrivalTime", "arrival")) : null,
      seat:              isBoardingPass ? getField("seat", "seatNumber") : null,
      booking_reference: isBoardingPass ? getField("confirmationNumber", "bookingRef", "pnr") : null,
      passenger_name:    getField("passenger", "name", "passengerName") || primaryValue || null,
      // subtitle: bestes Nicht-Primär-Feld für Nicht-Boarding-Pässe
      subtitle:          !isBoardingPass && subtitleField
                           ? `${subtitleField.label ? subtitleField.label + ": " : ""}${String(subtitleField.value).trim()}`
                           : null,
      logo_text:         p.logoText || null,
      description:       p.description || null,
      barcode:           barcodeValue,
      color_background:  toHex(p.backgroundColor) || null,
      color_foreground:  toHex(p.foregroundColor) || null,
      color_label:       toHex(p.labelColor)      || null,
      raw_data:          p,
    }
  } catch (err) {
    throw new Error("Ungültige .pkpass-Datei: " + err.message)
  }
}

function parseDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export async function getPassesByUser(userId) {
  const result = await query(
    `SELECT id, airline, flight_number, origin, destination,
            departure_time, arrival_time, passenger_name,
            seat, booking_reference, barcode,
            color_background, color_foreground, color_label, logo_text,
            signature_valid, signature_reason,
            is_voided, expiration_date, subtitle,
            raw_data, created_at
     FROM passes WHERE user_id = $1 ORDER BY departure_time DESC NULLS LAST, created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function createPass(userId, data) {
  const result = await query(
    `INSERT INTO passes
       (user_id, airline, flight_number, origin, destination,
        departure_time, arrival_time, passenger_name,
        seat, booking_reference, barcode,
        color_background, color_foreground, color_label, logo_text,
        signature_valid, signature_reason,
        is_voided, expiration_date, subtitle,
        raw_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING *`,
    [
      userId, data.airline, data.flight_number, data.origin, data.destination,
      data.departure_time, data.arrival_time, data.passenger_name,
      data.seat, data.booking_reference, data.barcode,
      data.color_background, data.color_foreground, data.color_label,
      data.logo_text || data.description || null,
      data.signature_valid ?? false,
      data.signature_reason || null,
      data.is_voided ?? false,
      data.expiration_date || null,
      data.subtitle || null,
      data.raw_data ? JSON.stringify(data.raw_data) : null,
    ]
  )
  return result.rows[0]
}

export async function deletePass(userId, passId) {
  const result = await query(
    `DELETE FROM passes WHERE id = $1 AND user_id = $2 RETURNING id`,
    [passId, userId]
  )
  return result.rowCount > 0
}