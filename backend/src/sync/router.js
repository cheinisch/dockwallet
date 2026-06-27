POST   /api/sync/register-device     Gerät anmelden, gibt sync_token zurück
GET    /api/sync/devices             Alle Geräte des Users
DELETE /api/sync/devices/:id         Gerät entfernen

GET    /api/sync/passes              Pull (alle Pässe)
GET    /api/sync/passes?since=ISO    Delta-Pull (nur geänderte seit Timestamp)
POST   /api/sync/passes              Push (base64 .pkpass oder Metadaten)
DELETE /api/sync/passes/:id          Pass löschen

GET    /api/sync/status              Übersicht (Pass-Anzahl + Geräte)