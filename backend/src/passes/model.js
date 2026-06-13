import { query } from "../db.js"
import AdmZip from "adm-zip"

/**
 * Parst eine .pkpass-Datei (ZIP) und extrahiert pass.json
 */
export function parsePkpass(buffer) {
  try {
    const zip = new AdmZip(buffer)
    const passEntry = zip.getEntry("pass.json")
    if (!passEntry) throw new Error("Keine pass.json in der .pkpass-Datei gefunden")

    const passJson = JSON.parse(passEntry.getData().toString("utf8"))

    // Flugdaten aus verschiedenen pkpass-Strukturen extrahieren
    const boardingPass = passJson.boardingPass || {}
    const fields = [
      ...(boardingPass.headerFields || []),
      ...(boardingPass.primaryFields || []),
      ...(boardingPass.secondaryFields || []),
      ...(boardingPass.auxiliaryFields || []),
      ...(boardingPass.backFields || []),
    ]

    const getField = (...keys) => {
      for (const key of keys) {
        const f = fields.find(
          (f) => f.key?.toLowerCase() === key.toLowerCase() ||
                 f.label?.toLowerCase().includes(key.toLowerCase())
        )
        if (f) return f.value
      }
      return null
    }

    const barcodes = passJson.barcodes || (passJson.barcode ? [passJson.barcode] : [])
    const barcodeValue = barcodes[0]?.message || null

    return {
      airline: passJson.organizationName || getField("airline", "carrier") || null,
      flight_number: getField("flightNumber", "flight", "flightnumber") || null,
      origin: getField("origin", "depart", "from", "departureAirport") || null,
      destination: getField("destination", "arrive", "to", "arrivalAirport") || null,
      departure_time: parseDate(getField("departureDate", "boardingTime", "departure")) ,
      arrival_time: parseDate(getField("arrivalDate", "arrivalTime", "arrival")),
      passenger_name: passJson.relevantDate
        ? getField("passenger", "name", "passengerName")
        : getField("passenger", "name", "passengerName"),
      seat: getField("seat", "seatNumber"),
      booking_reference: getField("confirmationNumber", "bookingRef", "pnr", "locator"),
      barcode: barcodeValue,
      raw_data: passJson,
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

/** Alle Pässe eines Users laden */
export async function getPassesByUser(userId) {
  const result = await query(
    `SELECT id, airline, flight_number, origin, destination,
            departure_time, arrival_time, passenger_name,
            seat, booking_reference, barcode, created_at
     FROM passes WHERE user_id = $1 ORDER BY departure_time DESC NULLS LAST, created_at DESC`,
    [userId]
  )
  return result.rows
}

/** Pass speichern */
export async function createPass(userId, data) {
  const result = await query(
    `INSERT INTO passes
       (user_id, airline, flight_number, origin, destination,
        departure_time, arrival_time, passenger_name,
        seat, booking_reference, barcode, raw_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      userId,
      data.airline,
      data.flight_number,
      data.origin,
      data.destination,
      data.departure_time,
      data.arrival_time,
      data.passenger_name,
      data.seat,
      data.booking_reference,
      data.barcode,
      data.raw_data ? JSON.stringify(data.raw_data) : null,
    ]
  )
  return result.rows[0]
}

/** Pass löschen (nur wenn Eigentümer) */
export async function deletePass(userId, passId) {
  const result = await query(
    `DELETE FROM passes WHERE id = $1 AND user_id = $2 RETURNING id`,
    [passId, userId]
  )
  return result.rowCount > 0
}