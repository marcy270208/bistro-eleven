import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('bistro.db');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator','client'))
);

CREATE TABLE IF NOT EXISTS dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  image TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  order_type TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  payment_method TEXT,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  dish_id INTEGER NOT NULL REFERENCES dishes(id),
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);
`);


if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
  const ins = db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)');
  ins.run('admin', bcrypt.hashSync('admin123', 10), 'Bistro Admin', 'administrator');
  ins.run('user', bcrypt.hashSync('user123', 10), 'Customer', 'client');
}


if (!db.prepare('SELECT 1 FROM dishes LIMIT 1').get()) {
  const ins = db.prepare('INSERT INTO dishes (name, description, price, image) VALUES (?, ?, ?, ?)');
  const dishes = [
    ['Classic Club Sandwich', 'Toasted bread, tender chicken, fried egg, and fresh greens.', 20000, './images/dish1.png'],
    ['Spaghetti Bolognese', 'Pasta with rich meat sauce and parmesan.', 30000, './images/dish2.jpg'],
    ['Crispy Fried Chicken', 'Crispy chicken seasoned with Bistro Eleven herbs.', 35000, './images/dish3.jpg'],
    ['Classic Pepperoni Pizza', 'Pepperoni, mozzarella, and a rich tomato sauce.', 40000, './images/dish4.png'],
    ['Chocolate Lava Cake', 'Warm chocolate cake with a gooey molten center, dusted with powdered sugar.', 25000, './images/lava_cake.png'],
    ['Berry & Butter Pancakes', 'Fluffy pancakes topped with fresh berries, butter, and maple syrup.', 28000, './images/pancakes.png'],
    ['Fresh Orange Juice', 'Freshly squeezed orange juice served with mint and ice.', 15000, './images/orange_juice.png'],
    ['Strawberry Smoothie', 'Creamy strawberry smoothie blended with fresh mint.', 18000, './images/strawberry_smoothie.png'],
  ];
  dishes.forEach((d) => ins.run(...d));
}

export default db;
