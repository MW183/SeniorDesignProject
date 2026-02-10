import { verifyJwt } from '../utils.js';

// Accepts token via `Authorization: Bearer <token>` or a cookie named `token`.
export default function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  let token = null;
  if (match) token = match[1];
  else if (req.cookies && req.cookies.token) token = req.cookies.token;

  if (!token) {
    console.log('[Auth] Missing token from',  req.ip, req.path);
    return res.status(401).json({ error: 'Missing Authorization token' });
  }
    try {
      const payload = verifyJwt(token);
      req.user = { id: payload.sub, role: payload.role };
      
      console.log(`[Auth] Valid token for user ${payload.sub} (${payload.role})`, req.ip, req.path);
      return next();
  } catch (err) {
    console.log('[Auth] Invalid/Expired token:', err.message, req.ip, req.path);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
