import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database(process.env.DB_PATH || 'bistro.db');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  email_verification_hash TEXT,
  email_verification_expires TEXT,
  password_reset_hash TEXT,
  password_reset_expires TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  photo TEXT,
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

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map(column => column.name));
for (const [name, type] of [
  ['email', 'TEXT'], ['email_verified', 'INTEGER NOT NULL DEFAULT 0'],
  ['email_verification_hash', 'TEXT'], ['email_verification_expires', 'TEXT'],
  ['password_reset_hash', 'TEXT'], ['password_reset_expires', 'TEXT'],
  ['phone', 'TEXT'], ['address', 'TEXT'], ['photo', 'TEXT'],
]) {
  if (!userColumns.has(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email COLLATE NOCASE) WHERE email IS NOT NULL AND email != ''");

const isProduction = process.env.NODE_ENV === 'production';
const adminUsername = process.env.ADMIN_USERNAME || (isProduction ? '' : 'admin');
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'admin123');
if (isProduction && (!adminUsername || !adminPassword)) {
  throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD for the production administrator account.');
}
if (!db.prepare('SELECT 1 FROM users WHERE username = ?').get(adminUsername)) {
  db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(adminUsername, bcrypt.hashSync(adminPassword, 12), 'Bistro Admin', 'administrator');
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
