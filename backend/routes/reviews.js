import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.json(
    await db.all(`SELECT reviews.id, reviews.rating, reviews.text, reviews.created_at AS createdAt, users.name, users.photo
    FROM reviews JOIN users ON users.id = reviews.user_id ORDER BY reviews.id DESC`)
  );
});

router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only customer accounts can post reviews' });
  const account = await db.get('SELECT photo FROM users WHERE id = ?', req.user.id);
  if (!account?.photo)
    return res.status(403).json({ error: 'Upload a profile photo in Account settings before posting a review' });
  const rating = Number(req.body.rating);
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text || text.length > 1000)
    return res.status(400).json({ error: 'A review (up to 1000 characters) and a rating from 1 to 5 are required' });

  const result = await db.run('INSERT INTO reviews (user_id, rating, text) VALUES (?, ?, ?)', req.user.id, rating, text);
  res.status(201).json(
    await db.get(
      `SELECT reviews.id, reviews.rating, reviews.text, reviews.created_at AS createdAt, users.name, users.photo
    FROM reviews JOIN users ON users.id = reviews.user_id WHERE reviews.id = ?`,
      result.lastInsertRowid
    )
  );
});

export default router;
