import jwt from "jsonwebtoken"

export function requireAuth(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Nicht authentifiziert" })
  }

  const token = header.split(" ")[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: "Token ungültig oder abgelaufen" })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: "Kein Zugriff" })
  }
  next()
}