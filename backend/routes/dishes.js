import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { resolveImageUrl } from '../storage.js';

const router = Router();
const adminOnly = [auth, requireRole('administrator')];

function formatDish(row) {
  if (!row) return row;
  let ingredients = [];
  if (Array.isArray(row.ingredients)) {
    ingredients = row.ingredients;
  } else if (typeof row.ingredients === 'string' && row.ingredients.trim()) {
    try {
      const parsed = JSON.parse(row.ingredients);
      ingredients = Array.isArray(parsed) ? parsed : [];
    } catch {
      ingredients = row.ingredients.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return { ...row, ingredients };
}

function serializeIngredients(ingredients) {
  if (Array.isArray(ingredients)) {
    return JSON.stringify(ingredients.map((s) => String(s).trim()).filter(Boolean));
  }
  if (typeof ingredients === 'string' && ingredients.trim()) {
    return JSON.stringify(ingredients.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean));
  }
  return JSON.stringify([]);
}

router.get('/', async (_req, res) => {
  const rows = await db.all('SELECT * FROM dishes ORDER BY id');
  res.json(rows.map(formatDish));
});

router.get('/:id', async (req, res) => {
  const dish = await db.get('SELECT * FROM dishes WHERE id = ?', req.params.id);
  if (!dish) return res.status(404).json({ error: 'Dish not found' });
  res.json(formatDish(dish));
});

router.post('/', adminOnly, async (req, res) => {
  const { name, description, ingredients, price, image } = req.body;
  const parsedPrice = Number(price);
  if (!name?.trim() || !Number.isInteger(parsedPrice) || parsedPrice <= 0)
    return res.status(400).json({ error: 'name and a positive integer price are required' });

  let imageUrl = null;
  try {
    imageUrl = await resolveImageUrl(image);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const info = await db.run(
    'INSERT INTO dishes (name, description, ingredients, price, image) VALUES (?, ?, ?, ?, ?)',
    name.trim(),
    description?.trim() ?? null,
    serializeIngredients(ingredients),
    parsedPrice,
    imageUrl
  );
  res.status(201).json(formatDish(await db.get('SELECT * FROM dishes WHERE id = ?', info.lastInsertRowid)));
});

router.put('/:id', adminOnly, async (req, res) => {
  const { name, description, ingredients, price, image } = req.body;
  const parsedPrice = Number(price);
  if (!name?.trim() || !Number.isInteger(parsedPrice) || parsedPrice <= 0)
    return res.status(400).json({ error: 'name and a positive integer price are required' });

  let imageUrl = null;
  try {
    imageUrl = await resolveImageUrl(image);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const info = await db.run(
    'UPDATE dishes SET name = ?, description = ?, ingredients = ?, price = ?, image = ? WHERE id = ?',
    name.trim(),
    description?.trim() ?? null,
    serializeIngredients(ingredients),
    parsedPrice,
    imageUrl,
    req.params.id
  );
  if (!info.changes) return res.status(404).json({ error: 'Dish not found' });
  res.json(formatDish(await db.get('SELECT * FROM dishes WHERE id = ?', req.params.id)));
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
