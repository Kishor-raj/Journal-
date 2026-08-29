export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
