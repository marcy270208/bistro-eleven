import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { sendAccountEmail } from '../email.js';

const router = Router();

const signToken = (u) =>
  jwt.sign({ id: u.id, username: u.username, role: u.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const actionUrl = (page, token) =>
  `${(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')}/#/${page}?token=${encodeURIComponent(token)}`;
const validEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

router.post('/register', async (req, res) => {
  const { username, password, name, email } = req.body;
  if (!username?.trim() || !password || !name?.trim() || !validEmail(email))
    return res.status(400).json({ error: 'Name, username, email, and password are required' });
  if (String(password).length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (await db.get('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE', username.trim()))
    return res.status(409).json({ error: 'Username already taken' });
  if (await db.get('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE', email.trim()))
    return res.status(409).json({ error: 'Email already registered' });

  const info = await db.run(
    'INSERT INTO users (username, password_hash, email, name, role) VALUES (?, ?, ?, ?, ?)',
    username.trim(),
    bcrypt.hashSync(password, 10),
    email.trim().toLowerCase(),
    name.trim(),
    'client'
  );
  res.status(201).json({
    id: info.lastInsertRowid,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    name: name.trim(),
    emailVerified: 0,
    role: 'client',
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', String(username || '').trim());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash))
    return res.status(401).json({ error: 'Wrong username or password' });
  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: Boolean(user.email_verified),
      name: user.name,
      phone: user.phone,
      address: user.address,
      photo: user.photo,
      role: user.role,
    },
  });
});

router.get('/me', auth, async (req, res) => {
  const user = await db.get(
    'SELECT id, username, email, email_verified AS emailVerified, name, phone, address, photo, role FROM users WHERE id = ?',
    req.user.id
  );
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  user.emailVerified = Boolean(user.emailVerified);
  res.json(user);
});

router.put('/profile', auth, async (req, res) => {
  const { name, email, phone = '', address = '', photo = null } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
    return res.status(400).json({ error: 'Name is required and must be under 80 characters' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (typeof phone !== 'string' || phone.length > 30 || typeof address !== 'string' || address.length > 500)
    return res.status(400).json({ error: 'Phone or address is too long' });
  if (
    photo !== null &&
    (typeof photo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(photo) || photo.length > 4_500_000)
  )
    return res.status(400).json({ error: 'Choose a PNG, JPG, or WebP photo under 3 MB' });

  const normalizedEmail = email.trim().toLowerCase();
  const duplicate = await db.get(
    'SELECT 1 FROM users WHERE email = ? COLLATE NOCASE AND id != ?',
    normalizedEmail,
    req.user.id
  );
  if (duplicate) return res.status(409).json({ error: 'Email already used by another account' });
  const account = await db.get('SELECT email FROM users WHERE id = ?', req.user.id);
  const emailChanged = account.email?.toLowerCase() !== normalizedEmail;
  if (emailChanged) {
    await db.run(
      `UPDATE users SET email = ?, email_verified = 0, email_verification_hash = NULL, email_verification_expires = NULL,
      name = ?, phone = ?, address = ?, photo = ? WHERE id = ?`,
      normalizedEmail,
      name.trim(),
      phone.trim(),
      address.trim(),
      photo,
      req.user.id
    );
  } else {
    await db.run(
      'UPDATE users SET name = ?, phone = ?, address = ?, photo = ? WHERE id = ?',
      name.trim(),
      phone.trim(),
      address.trim(),
      photo,
      req.user.id
    );
  }
  const updated = await db.get(
    'SELECT id, username, email, email_verified AS emailVerified, name, phone, address, photo, role FROM users WHERE id = ?',
    req.user.id
  );
  updated.emailVerified = Boolean(updated.emailVerified);
  res.json(updated);
});

router.post('/email/send-verification', auth, async (req, res) => {
  const account = await db.get('SELECT email, email_verified FROM users WHERE id = ?', req.user.id);
  if (!account?.email) return res.status(400).json({ error: 'Add an email address to your account first' });
  if (account.email_verified) return res.json({ message: 'Email is already verified' });
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.run(
    'UPDATE users SET email_verification_hash = ?, email_verification_expires = ? WHERE id = ?',
    hashToken(token),
    expires,
    req.user.id
  );
  try {
    const link = actionUrl('verify-email', token);
    await sendAccountEmail({
      to: account.email,
      subject: 'Verify your Bistro Eleven email',
      text: `Verify your email address using this link (valid for one hour): ${link}`,
      html: `<p>Verify your Bistro Eleven email address:</p><p><a href="${link}">Verify email</a></p><p>This link expires in one hour.</p>`,
    });
    res.json({ message: 'Verification link sent. Check your inbox.' });
  } catch (error) {
    await db.run('UPDATE users SET email_verification_hash = NULL, email_verification_expires = NULL WHERE id = ?', req.user.id);
    res.status(error.status || 502).json({ error: error.message || 'Could not send the verification email' });
  }
});

router.get('/verify-email', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) return res.status(400).json({ error: 'Verification link is invalid or expired' });
  const result = await db.run(
    `UPDATE users SET email_verified = 1
    WHERE email_verification_hash = ? AND julianday(email_verification_expires) > julianday('now')`,
    hashToken(token)
  );
  if (!result.changes) return res.status(400).json({ error: 'Verification link is invalid or expired' });
  res.json({ message: 'Email verified successfully' });
});

router.post('/forgot-password', async (req, res) => {
  const email = validEmail(req.body.email) ? req.body.email.trim().toLowerCase() : '';
  const account = email
    ? await db.get('SELECT id, email FROM users WHERE email = ? COLLATE NOCASE AND email_verified = 1', email)
    : null;
  if (account) {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await db.run(
      'UPDATE users SET password_reset_hash = ?, password_reset_expires = ? WHERE id = ?',
      hashToken(token),
      expires,
      account.id
    );
    try {
      const link = actionUrl('reset-password', token);
      await sendAccountEmail({
        to: account.email,
        subject: 'Reset your Bistro Eleven password',
        text: `Create a new password using this one-time link (valid for 30 minutes): ${link}`,
        html: `<p>Use this one-time link to create a new Bistro Eleven password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>`,
      });
    } catch (error) {
      await db.run('UPDATE users SET password_reset_hash = NULL, password_reset_expires = NULL WHERE id = ?', account.id);
      return res.status(error.status || 502).json({ error: error.message || 'Could not send the password reset email' });
    }
  }
  res.json({ message: 'If this email belongs to a verified account, a password reset link has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const result = await db.run(
    `UPDATE users SET password_hash = ?, password_reset_hash = NULL, password_reset_expires = NULL
    WHERE password_reset_hash = ? AND julianday(password_reset_expires) > julianday('now')`,
    bcrypt.hashSync(newPassword, 10),
    hashToken(typeof token === 'string' ? token : '')
  );
  if (!result.changes) return res.status(400).json({ error: 'Reset link is invalid or expired. Request a new one.' });
  res.json({ message: 'Password reset successfully. You can now sign in.' });
});

router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const account = await db.get('SELECT password_hash FROM users WHERE id = ?', req.user.id);
  if (!bcrypt.compareSync(currentPassword || '', account?.password_hash || ''))
    return res.status(400).json({ error: 'Current password is incorrect' });
  if (typeof newPassword !== 'string' || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ message: 'Password changed successfully' });
});

export default router;
