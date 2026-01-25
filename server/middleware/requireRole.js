export default function requireRole(allowed = []) {
  return function (req, res, next) {
    const user = req.user;
    if (!user || !user.role) {
      console.log('[Role] Unauthorized access attempt', req.ip, req.path);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(allowed)) allowed = [allowed];
    if (!allowed.includes(user.role)) {
      console.log(`[Role] Forbidden: user ${user.id} role=${user.role} not in [${allowed.join(', ')}]`, req.ip, req.path);
      return res.status(403).json({ error: 'Forbidden' });
    }

    console.log(`[Role] Access granted for user ${user.id} role=${user.role}`, req.ip, req.path);
    return next();
  };
}