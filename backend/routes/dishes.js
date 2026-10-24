import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [auth, requireRole('administrator')];

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM dishes ORDER BY id').all());
});

router.post('/', adminOnly, (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !Number.isInteger(price) || price <= 0)
    return res.status(400).json({ error: 'name and a positive integer price are required' });
  const info = db
    .prepare('INSERT INTO dishes (name, description, price, image) VALUES (?, ?, ?, ?)')
    .run(name, description ?? null, price, image ?? null);
  res.status(201).json(db.prepare('SELECT * FROM dishes WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !Number.isInteger(price) || price <= 0)
    return res.status(400).json({ error: 'name and a positive integer price are required' });
  const info = db
    .prepare('UPDATE dishes SET name = ?, description = ?, price = ?, image = ? WHERE id = ?')
    .run(name, description ?? null, price, image ?? null, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Dish not found' });
  res.json(db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', adminOnly, (req, res) => {
  try {
    const info = db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Dish not found' });
    res.status(204).end();
  } catch {
    res.status(409).json({ error: 'Dish is used in existing orders and cannot be deleted' });
  }
});

export default router;
