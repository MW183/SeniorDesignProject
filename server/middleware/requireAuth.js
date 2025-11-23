import { verifyJwt } from '../utils.js';

// Accepts token via `Authorization: Bearer <token>` or a cookie named `token`.
export default function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  let token = null;
  if (match) token = match[1];
  else if (req.cookies && req.cookies.token) token = req.cookies.token;

  if (!token) return res.status(401).json({ error: 'Missing Authorization token' });
  try {
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
