import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [auth, requireRole('administrator')];

router.get('/', async (_req, res) => {
  res.json(await db.all('SELECT * FROM dishes ORDER BY id'));
});

router.post('/', adminOnly, async (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !Number.isInteger(price) || price <= 0)
    return res.status(400).json({ error: 'name and a positive integer price are required' });
  const info = await db.run(
    'INSERT INTO dishes (name, description, price, image) VALUES (?, ?, ?, ?)',
    name,
    description ?? null,
    price,
    image ?? null
  );
  res.status(201).json(await db.get('SELECT * FROM dishes WHERE id = ?', info.lastInsertRowid));
});

router.put('/:id', adminOnly, async (req, res) => {
  const { name, description, price, image } = req.body;
  if (!name || !Number.isInteger(price) || price <= 0)
    return res.status(400).json({ error: 'name and a positive integer price are required' });
  const info = await db.run(
    'UPDATE dishes SET name = ?, description = ?, price = ?, image = ? WHERE id = ?',
    name,
    description ?? null,
    price,
    image ?? null,
    req.params.id
  );
  if (!info.changes) return res.status(404).json({ error: 'Dish not found' });
  res.json(await db.get('SELECT * FROM dishes WHERE id = ?', req.params.id));
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const info = await db.run('DELETE FROM dishes WHERE id = ?', req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Dish not found' });
    res.status(204).end();
  } catch {
    res.status(409).json({ error: 'Dish is used in existing orders and cannot be deleted' });
  }
});

export default router;
