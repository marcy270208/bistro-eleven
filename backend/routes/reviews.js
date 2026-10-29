import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.prepare(`SELECT reviews.id, reviews.rating, reviews.text, reviews.created_at AS createdAt, users.name, users.photo
    FROM reviews JOIN users ON users.id = reviews.user_id ORDER BY reviews.id DESC`).all());
});

router.post('/', auth, (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only customer accounts can post reviews' });
  const account = db.prepare('SELECT photo FROM users WHERE id = ?').get(req.user.id);
  if (!account?.photo) return res.status(403).json({ error: 'Upload a profile photo in Account settings before posting a review' });
  const rating = Number(req.body.rating);
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text || text.length > 1000)
    return res.status(400).json({ error: 'A review (up to 1000 characters) and a rating from 1 to 5 are required' });

  const result = db.prepare('INSERT INTO reviews (user_id, rating, text) VALUES (?, ?, ?)').run(req.user.id, rating, text);
  res.status(201).json(db.prepare(`SELECT reviews.id, reviews.rating, reviews.text, reviews.created_at AS createdAt, users.name, users.photo
    FROM reviews JOIN users ON users.id = reviews.user_id WHERE reviews.id = ?`).get(result.lastInsertRowid));
});

export default router;
