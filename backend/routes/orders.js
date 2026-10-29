import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [auth, requireRole('administrator')];
const clientOnly = [auth, requireRole('client')];

function getOrders(user) {
  const records = user.role === 'administrator'
    ? db.prepare(`SELECT o.code AS id, u.username, u.name AS customer, o.order_type AS type, o.location, o.notes,
        o.payment_method AS payment, o.total_price AS total, o.status, o.created_at AS createdAt
      FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC`).all()
    : db.prepare(`SELECT o.code AS id, u.username, u.name AS customer, o.order_type AS type, o.location, o.notes,
        o.payment_method AS payment, o.total_price AS total, o.status, o.created_at AS createdAt
      FROM orders o JOIN users u ON u.id = o.user_id WHERE o.user_id = ? ORDER BY o.id DESC`).all(user.id);
  const items = db.prepare(`SELECT d.name, oi.dish_id AS id, oi.qty, oi.unit_price AS price
    FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN dishes d ON d.id = oi.dish_id WHERE o.code = ?`);
  return records.map(order => ({ ...order, items: items.all(order.id) }));
}

router.get('/', auth, (req, res) => res.json(getOrders(req.user)));

router.post('/', clientOnly, (req, res) => {
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
    const dish = db.prepare('SELECT id, name, price FROM dishes WHERE name = ? COLLATE NOCASE').get(item.name);
    if (!dish) return res.status(400).json({ error: `Dish not found: ${item.name}` });
    items.push({ ...dish, qty: item.qty });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const code = `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const transaction = db.transaction(() => {
    const order = db.prepare(`INSERT INTO orders (code, user_id, order_type, location, notes, payment_method, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(code, req.user.id, type, location.trim(), notes.trim(), payment, total);
    const insertItem = db.prepare('INSERT INTO order_items (order_id, dish_id, qty, unit_price) VALUES (?, ?, ?, ?)');
    items.forEach(item => insertItem.run(order.lastInsertRowid, item.id, item.qty, item.price));
  });
  transaction();
  res.status(201).json(getOrders(req.user).find(order => order.id === code));
});

router.patch('/:code/status', adminOnly, (req, res) => {
  const allowed = ['New', 'Preparing', 'On the way', 'Completed', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid order status' });
  const result = db.prepare('UPDATE orders SET status = ? WHERE code = ?').run(req.body.status, req.params.code);
  if (!result.changes) return res.status(404).json({ error: 'Order not found' });
  res.json(getOrders(req.user).find(order => order.id === req.params.code));
});

export default router;
