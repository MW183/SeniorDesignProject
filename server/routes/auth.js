import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, comparePassword, hashPassword, signJwt, verifyJwt } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import {z} from 'zod';
import { validateBody } from '../validators/validateBase.js';
import sgMail from '@sendgrid/mail';

const router = express.Router();

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Utility function to generate verification token
function generateVerificationToken() {
  return signJwt({ type: 'email_verify' }, process.env.EMAIL_VERIFY_EXPIRES || '24h');
}

// Utility function to generate verification link
function getVerificationLink(token) {
  return `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
}

// POST /auth/register — create a new user (email unverified)
const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(['USER', 'ADMIN', 'SUPPORT', 'CLIENT']).optional().default('USER')
});

router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with email unverified
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    const verificationLink = getVerificationLink(verificationToken);
    
    // Send verification email via SendGrid
    try {
      await sgMail.send({
        to: user.email,
        from: 'noreply@weddingplanner.com',
        subject: 'Verify Your Email Address',
        html: `
          <h2>Welcome to Wedding Planner!</h2>
          <p>Hi ${user.name},</p>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy this link: ${verificationLink}</p>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        `
      });
      console.log(`[Auth] Verification email sent to ${user.email}`);
    } catch (emailErr) {
      console.error(`[Auth] Failed to send verification email to ${user.email}:`, emailErr);
      // Don't fail the registration if email fails, but log it
    }

    // In production, send email with verification link
    res.status(201).json({
      message: 'User created. Please verify your email.',
      verificationLink, // For development
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /auth/verify-email — verify email with token
const verifyEmailSchema = z.object({
  token: z.string()
});

router.post('/verify-email', validateBody(verifyEmailSchema), async (req, res) => {
  try {
    const { token } = req.body;

    // Find user with this verification token
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Check if token is expired
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: 'Verification token expired' });
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    console.log(`[Auth] Email verified for user ${user.email}`);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /auth/resend-verification — resend verification email
const resendVerificationSchema = z.object({
  email: z.email()
});

router.post('/resend-verification', validateBody(resendVerificationSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({ message: 'If that email exists, a verification link has been sent' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    const verificationLink = getVerificationLink(verificationToken);
    
    // Send verification email via SendGrid
    try {
      await sgMail.send({
        to: user.email,
        from: 'noreply@weddingplanner.com',
        subject: 'Verify Your Email Address',
        html: `
          <h2>Email Verification</h2>
          <p>Hi ${user.name},</p>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy this link: ${verificationLink}</p>
          <p>This link expires in 24 hours.</p>
        `
      });
      console.log(`[Auth] Verification email resent to ${email}`);
    } catch (emailErr) {
      console.error(`[Auth] Failed to send verification email to ${email}:`, emailErr);
    }

    res.json({ message: 'Verification email sent', verificationLink });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /auth/login — authenticate user, set httpOnly cookie and return token+user
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    //find user by email
    const user = await prisma.user.findUnique({ where: {email }});
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    // Check if email is verified (optional - can be enforced based on role)
    if (!user.emailVerified && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Email not verified. Please check your inbox.' });
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJwt({ 
      sub: user.id, role: user.role }, 
      process.env.JWT_EXPIRES || '1h'
    );
    
    //set httpOnly cookie
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' 
    });


    console.log(`[Auth] User ${user.email} logged in`);

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        emailVerified: user.emailVerified 
      } 
    });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /auth/me — return current authenticated user (requires valid token via header or cookie)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { id: true, name: true, email: true, role: true, emailVerified: true } 
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user });
  } catch (err) { 
    handlePrismaError(res, err); }
});

// POST /auth/request-reset — generate a short-lived reset token (dev: returns link). In production, email the link.
const requestResetSchema = z.object({
  email: z.email()
});

router.post('/request-reset', validateBody(requestResetSchema), async (req, res) => {
  try {
    const { email } = req.body;


    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Always respond 200 to prevent user enumeration
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent' });
    }


    // Sign short-lived reset token
    const resetToken = signJwt(
      { sub: user.id, type: 'password_reset' },
      process.env.RESET_EXPIRES || '15m'
    );

    const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    // Send password reset email via SendGrid
    try {
      await sgMail.send({
        to: user.email,
        from: 'noreply@weddingplanner.com',
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy this link: ${resetLink}</p>
          <p><strong>This link expires in 15 minutes.</strong></p>
          <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        `
      });
      console.log(`[Auth] Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error(`[Auth] Failed to send reset email to ${user.email}:`, emailErr);
    }

    // Respond with success message (don't reveal if email was actually sent)
    res.json({ message: 'If that email exists, a password reset link has been sent' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

const resetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6)
});

// POST /auth/reset — verify reset token and update password (token + newPassword required)
router.post('/reset', validateBody(resetSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    let payload;
    try {
      payload = verifyJwt(token);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (payload.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const userId = payload.sub;
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    
    console.log(`[Auth] Password reset for user ${userId}`);
    res.json({ message: 'Password updated' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /auth/logout — clear the httpOnly cookie
router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('token');
  console.log(`[Auth] User ${req.user.id} logged out`);
  res.json({ message: 'Logged out' });
});

export default router;

