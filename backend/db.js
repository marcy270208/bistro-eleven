import bcrypt from 'bcryptjs';
import { resolveImageUrl } from './storage.js';

const STATIC_IMAGE_BASE = 'https://marcy270208.github.io/bistro-eleven/images';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    ingredients TEXT,
    price INTEGER NOT NULL,
    image TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
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
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    dish_id INTEGER NOT NULL REFERENCES dishes(id),
    qty INTEGER NOT NULL,
    unit_price INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

const INITIAL_DISHES = [
  [
    'Classic Club Sandwich',
    'Toasted bread, tender chicken, fried egg, and fresh greens.',
    JSON.stringify(['Toasted bread', 'Chicken', 'Fried egg', 'Lettuce', 'Tomato', 'Mayonnaise']),
    20000,
    `${STATIC_IMAGE_BASE}/dish1.png`,
  ],
  [
    'Spaghetti Bolognese',
    'Pasta with rich meat sauce and parmesan.',
    JSON.stringify(['Spaghetti', 'Ground beef', 'Tomato', 'Onion', 'Garlic', 'Parmesan']),
    30000,
    `${STATIC_IMAGE_BASE}/dish2.jpg`,
  ],
  [
    'Crispy Fried Chicken',
    'Crispy chicken seasoned with Bistro Eleven herbs.',
    JSON.stringify(['Chicken', 'Wheat flour', 'Bistro Eleven herbs and spices', 'Cooking oil']),
    35000,
    `${STATIC_IMAGE_BASE}/dish3.jpg`,
  ],
  [
    'Classic Pepperoni Pizza',
    'Pepperoni, mozzarella, and a rich tomato sauce.',
    JSON.stringify(['Pizza dough', 'Pepperoni', 'Mozzarella', 'Tomato sauce']),
    40000,
    `${STATIC_IMAGE_BASE}/dish4.png`,
  ],
  [
    'Chocolate Lava Cake',
    'Warm chocolate cake with a gooey molten center, dusted with powdered sugar.',
    JSON.stringify(['Dark chocolate', 'Butter', 'Eggs', 'Sugar', 'Wheat flour', 'Powdered sugar']),
    25000,
    `${STATIC_IMAGE_BASE}/lava_cake.png`,
  ],
  [
    'Berry & Butter Pancakes',
    'Fluffy pancakes topped with fresh berries, butter, and maple syrup.',
    JSON.stringify(['Wheat flour', 'Milk', 'Eggs', 'Butter', 'Fresh berries', 'Maple syrup']),
    28000,
    `${STATIC_IMAGE_BASE}/pancakes.png`,
  ],
  [
    'Fresh Orange Juice',
    'Freshly squeezed orange juice served with mint and ice.',
    JSON.stringify(['Fresh oranges', 'Mint', 'Ice']),
    15000,
    `${STATIC_IMAGE_BASE}/orange_juice.png`,
  ],
  [
    'Strawberry Smoothie',
    'Creamy strawberry smoothie blended with fresh mint.',
    JSON.stringify(['Strawberries', 'Milk', 'Yogurt', 'Fresh mint']),
    18000,
    `${STATIC_IMAGE_BASE}/strawberry_smoothie.png`,
  ],
];

let adapterPromise = null;

async function createAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (tursoUrl) {
    const { createClient } = await import('@libsql/client/web');
    const client = createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
    });
    return {
      isCloud: true,
      async execRaw(sql, args = []) {
        return client.execute({ sql, args });
      },
      async get(sql, args = []) {
        const res = await client.execute({ sql, args });
        return res.rows[0] ? { ...res.rows[0] } : undefined;
      },
      async all(sql, args = []) {
        const res = await client.execute({ sql, args });
        return res.rows.map((r) => ({ ...r }));
      },
      async run(sql, args = []) {
        const res = await client.execute({ sql, args });
        return {
          changes: Number(res.rowsAffected || 0),
          lastInsertRowid: Number(res.lastInsertRowid || 0),
        };
      },
    };
  }

  const { default: Database } = await import('better-sqlite3');
  const sqlite = new Database(process.env.DB_PATH || 'bistro.db');
  sqlite.pragma('foreign_keys = ON');
  return {
    isCloud: false,
    async execRaw(sql) {
      sqlite.exec(sql);
    },
    async get(sql, args = []) {
      return sqlite.prepare(sql).get(...args);
    },
    async all(sql, args = []) {
      return sqlite.prepare(sql).all(...args);
    },
    async run(sql, args = []) {
      const info = sqlite.prepare(sql).run(...args);
      return {
        changes: Number(info.changes || 0),
        lastInsertRowid: Number(info.lastInsertRowid || 0),
      };
    },
  };
}

async function initAdapter() {
  const adapter = await createAdapter();
  if (adapter.isCloud) {
    await adapter.execRaw('PRAGMA foreign_keys = ON');
  }
  for (const stmt of SCHEMA_STATEMENTS) {
    await adapter.execRaw(stmt);
  }

  const cols = await adapter.all('PRAGMA table_info(users)');
  const userColumns = new Set(cols.map((column) => column.name));
  for (const [name, type] of [
    ['email', 'TEXT'],
    ['email_verified', 'INTEGER NOT NULL DEFAULT 0'],
    ['email_verification_hash', 'TEXT'],
    ['email_verification_expires', 'TEXT'],
    ['password_reset_hash', 'TEXT'],
    ['password_reset_expires', 'TEXT'],
    ['phone', 'TEXT'],
    ['address', 'TEXT'],
    ['photo', 'TEXT'],
  ]) {
    if (!userColumns.has(name)) {
      await adapter.execRaw(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
    }
  }
  await adapter.execRaw(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email COLLATE NOCASE) WHERE email IS NOT NULL AND email != ''"
  );

  const dishCols = await adapter.all('PRAGMA table_info(dishes)');
  const dishColumns = new Set(dishCols.map((column) => column.name));
  if (!dishColumns.has('ingredients')) {
    await adapter.execRaw('ALTER TABLE dishes ADD COLUMN ingredients TEXT');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const adminUsername = process.env.ADMIN_USERNAME || (isProduction ? '' : 'admin');
  const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'admin123');
  if (isProduction && (!adminUsername || !adminPassword)) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD for the production administrator account.');
  }
  const existingAdmin = await adapter.get('SELECT 1 FROM users WHERE username = ?', [adminUsername]);
  if (!existingAdmin) {
    await adapter.run('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)', [
      adminUsername,
      bcrypt.hashSync(adminPassword, 12),
      'Bistro Admin',
      'administrator',
    ]);
  }

  const existingDish = await adapter.get('SELECT 1 FROM dishes LIMIT 1');
  if (!existingDish) {
    for (const d of INITIAL_DISHES) {
      await adapter.run(
        'INSERT INTO dishes (name, description, ingredients, price, image) VALUES (?, ?, ?, ?, ?)',
        d
      );
    }
  } else {
    // Ensure seeded dishes have full https:// image URLs and default ingredients
    for (const [name, , ingredientsJson, , imageUrl] of INITIAL_DISHES) {
      await adapter.run(
        `UPDATE dishes
         SET image = CASE WHEN image LIKE './images/%' THEN ? ELSE image END,
             ingredients = COALESCE(ingredients, ?)
         WHERE name = ?`,
        [imageUrl, ingredientsJson, name]
      );
    }
  }

  // Migrate any legacy base64 user photos in the database to external storage URLs
  const base64Users = await adapter.all("SELECT id, photo FROM users WHERE photo LIKE 'data:image/%'");
  for (const u of base64Users) {
    try {
      const url = await resolveImageUrl(u.photo);
      await adapter.run('UPDATE users SET photo = ? WHERE id = ?', [url, u.id]);
    } catch {
      // keep existing if external upload fails temporarily
    }
  }

  return adapter;
}

function getAdapter() {
  if (!adapterPromise) {
    adapterPromise = initAdapter().catch((err) => {
      adapterPromise = null;
      throw err;
    });
  }
  return adapterPromise;
}

const db = {
  async get(sql, ...args) {
    const adapter = await getAdapter();
    return adapter.get(sql, args);
  },
  async all(sql, ...args) {
    const adapter = await getAdapter();
    return adapter.all(sql, args);
  },
  async run(sql, ...args) {
    const adapter = await getAdapter();
    return adapter.run(sql, args);
  },
};

export default db;
