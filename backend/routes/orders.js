import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [auth, requireRole('administrator')];
const clientOnly = [auth, requireRole('client')];

async function getOrders(user) {
  const records =
    user.role === 'administrator'
      ? await db.all(`SELECT o.code AS id, u.username, u.name AS customer, o.order_type AS type, o.location, o.notes,
          o.payment_method AS payment, o.total_price AS total, o.status, o.created_at AS createdAt
        FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC`)
      : await db.all(
          `SELECT o.code AS id, u.username, u.name AS customer, o.order_type AS type, o.location, o.notes,
          o.payment_method AS payment, o.total_price AS total, o.status, o.created_at AS createdAt
        FROM orders o JOIN users u ON u.id = o.user_id WHERE o.user_id = ? ORDER BY o.id DESC`,
          user.id
        );

  const enriched = [];
  for (const order of records) {
    const items = await db.all(
      `SELECT d.name, oi.dish_id AS id, oi.qty, oi.unit_price AS price
      FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN dishes d ON d.id = oi.dish_id WHERE o.code = ?`,
      order.id
    );
    enriched.push({ ...order, items });
  }
  return enriched;
}

router.get('/', auth, async (req, res) => res.json(await getOrders(req.user)));

router.post('/', clientOnly, async (req, res) => {
  const { items: requestedItems, type, location, notes = '', payment } = req.body;
  if (!Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 30)
    return res.status(400).json({ error: 'Your cart is empty or contains too many items' });
  if (!['Delivery', 'Dine-in'].includes(type) || typeof location !== 'string' || !location.trim() || location.length > 500)
    return res.status(400).json({ error: 'A valid order type and destination are required' });
  if (!['Cash', 'QRIS', 'Bank transfer'].includes(payment))
    return res.status(400).json({ error: 'Choose a valid payment method' });
  if (typeof notes !== 'string' || notes.length > 500)
    return res.status(400).json({ error: 'Order notes must be under 500 characters' });

  const items = [];
  for (const item of requestedItems) {
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99 || typeof item.name !== 'string')
      return res.status(400).json({ error: 'One of the cart items is invalid' });
    const dish = await db.get('SELECT id, name, price FROM dishes WHERE name = ? COLLATE NOCASE', item.name);
    if (!dish) return res.status(400).json({ error: `Dish not found: ${item.name}` });
    items.push({ ...dish, qty: item.qty });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const code = `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const order = await db.run(
    `INSERT INTO orders (code, user_id, order_type, location, notes, payment_method, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    code,
    req.user.id,
    type,
    location.trim(),
    notes.trim(),
    payment,
    total
  );
  for (const item of items) {
    await db.run(
      'INSERT INTO order_items (order_id, dish_id, qty, unit_price) VALUES (?, ?, ?, ?)',
      order.lastInsertRowid,
      item.id,
      item.qty,
      item.price
    );
  }
  const allOrders = await getOrders(req.user);
  res.status(201).json(allOrders.find((o) => o.id === code));
});

router.patch('/:code/status', adminOnly, async (req, res) => {
  const allowed = ['New', 'Preparing', 'On the way', 'Completed', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid order status' });
  const result = await db.run('UPDATE orders SET status = ? WHERE code = ?', req.body.status, req.params.code);
  if (!result.changes) return res.status(404).json({ error: 'Order not found' });
  const allOrders = await getOrders(req.user);
  res.json(allOrders.find((o) => o.id === req.params.code));
});

export default router;
