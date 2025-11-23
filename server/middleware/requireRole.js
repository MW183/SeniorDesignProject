export default function requireRole(allowed = []) {
  return function (req, res, next) {
    const user = req.user;
    if (!user || !user.role) return res.status(401).json({ error: 'Unauthorized' });
    if (!Array.isArray(allowed)) allowed = [allowed];
    if (!allowed.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
