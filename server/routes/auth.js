import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, comparePassword, hashPassword, signJwt, verifyJwt } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// POST /auth/login — authenticate user, set httpOnly cookie and return token+user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJwt({ sub: user.id, role: user.role }, process.env.JWT_EXPIRES || '1h');
    // Set httpOnly cookie for better security; client can also use the returned token if desired
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /auth/me — return current authenticated user (requires valid token via header or cookie)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { handlePrismaError(res, err); }
});

// POST /auth/request-reset — generate a short-lived reset token (dev: returns link). In production, email the link.
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent' });

    // Sign a short-lived reset token containing user id
    const resetToken = signJwt({ sub: user.id }, process.env.RESET_EXPIRES || '15m');
    const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // TODO: send email via nodemailer in production
    res.json({ message: 'Reset link (development)', resetLink });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /auth/reset — verify reset token and update password (token + newPassword required)
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Missing token or newPassword' });

    let payload;
    try {
      payload = verifyJwt(token);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const userId = payload.sub;
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    res.json({ message: 'Password updated' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /auth/logout — clear the httpOnly cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;

