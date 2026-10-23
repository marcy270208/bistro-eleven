import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();

const signToken = (u) =>
  jwt.sign({ id: u.id, username: u.username, role: u.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

router.post('/register', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'username, password, and name are required' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username))
    return res.status(409).json({ error: 'Username already taken' });

  
  const info = db
    .prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(username, bcrypt.hashSync(password, 10), name, 'client');
  res.status(201).json({ id: info.lastInsertRowid, username, name, role: 'client' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash))
    return res.status(401).json({ error: 'Wrong username or password' });
  res.json({
    token: signToken(user),
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

router.get('/me', auth, (req, res) => res.json(req.user));

export default router;
