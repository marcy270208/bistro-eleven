import { startingDishes } from '../data/dishes';

const STORAGE_KEY = 'bistroFallbackDb_v1';

const validEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) return parsed;
    }
  } catch {
    // ignore corrupted local storage and re-seed
  }
  const initial = {
    nextUserId: 3,
    nextReviewId: 1,
    users: [
      {
        id: 1,
        username: 'admin',
        password: 'admin123',
        email: 'admin@bistroeleven.com',
        emailVerified: true,
        name: 'Bistro Admin',
        phone: '',
        address: '',
        photo: null,
        role: 'administrator',
      },
      {
        id: 2,
        username: 'user',
        password: 'user123',
        email: 'user@bistroeleven.com',
        emailVerified: true,
        name: 'Customer',
        phone: '',
        address: '',
        photo: null,
        role: 'client',
      },
    ],
    orders: [],
    reviews: [],
  };
  saveDb(initial);
  return initial;
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email || '',
    emailVerified: Boolean(u.emailVerified),
    name: u.name,
    phone: u.phone || '',
    address: u.address || '',
    photo: u.photo || null,
    role: u.role,
  };
}

function getAuthUser(db, token) {
  if (!token || typeof token !== 'string' || !token.startsWith('local-jwt-')) {
    const err = new Error('Token required');
    err.status = 401;
    throw err;
  }
  const id = Number(token.slice('local-jwt-'.length));
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    const err = new Error('Account no longer exists');
    err.status = 401;
    throw err;
  }
  return user;
}

function getCatalogDishes() {
  try {
    const saved = JSON.parse(localStorage.getItem('adminDishes') || 'null');
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {
    // fallback to startingDishes
  }
  return startingDishes;
}

export async function fallbackApi(path, { method = 'GET', token, body } = {}) {
  const db = loadDb();
  const upperMethod = method.toUpperCase();
  const payload = typeof body === 'string' && body ? JSON.parse(body) : body || {};
  const [pathname, queryString = ''] = path.split('?');
  const params = new URLSearchParams(queryString);

  // POST /api/auth/register
  if (pathname === '/api/auth/register' && upperMethod === 'POST') {
    const { username, password, name, email } = payload;
    if (!username?.trim() || !password || !name?.trim() || !validEmail(email)) {
      throw new Error('Name, username, email, and password are required');
    }
    if (String(password).length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (db.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      throw new Error('Username already taken');
    }
    if (db.users.some((u) => (u.email || '').toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('Email already registered');
    }
    const newUser = {
      id: db.nextUserId++,
      username: username.trim(),
      password: String(password),
      email: email.trim().toLowerCase(),
      emailVerified: false,
      name: name.trim(),
      phone: '',
      address: '',
      photo: null,
      role: 'client',
    };
    db.users.push(newUser);
    saveDb(db);
    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      emailVerified: 0,
      role: 'client',
    };
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && upperMethod === 'POST') {
    const { username, password } = payload;
    const user = db.users.find(
      (u) => u.username.toLowerCase() === String(username || '').trim().toLowerCase()
    );
    if (!user || user.password !== String(password || '')) {
      throw new Error('Wrong username or password');
    }
    return {
      token: `local-jwt-${user.id}`,
      user: publicUser(user),
    };
  }

  // GET /api/auth/me
  if (pathname === '/api/auth/me' && upperMethod === 'GET') {
    const user = getAuthUser(db, token);
    return publicUser(user);
  }

  // PUT /api/auth/profile
  if (pathname === '/api/auth/profile' && upperMethod === 'PUT') {
    const user = getAuthUser(db, token);
    const { name, email, phone = '', address = '', photo = null } = payload;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
      throw new Error('Name is required and must be under 80 characters');
    }
    if (!validEmail(email)) throw new Error('Enter a valid email address');
    if (typeof phone !== 'string' || phone.length > 30 || typeof address !== 'string' || address.length > 500) {
      throw new Error('Phone or address is too long');
    }
    if (
      photo !== null &&
      (typeof photo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(photo) || photo.length > 4_500_000)
    ) {
      throw new Error('Choose a PNG, JPG, or WebP photo under 3 MB');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const duplicate = db.users.some(
      (u) => u.id !== user.id && (u.email || '').toLowerCase() === normalizedEmail
    );
    if (duplicate) throw new Error('Email already used by another account');

    if ((user.email || '').toLowerCase() !== normalizedEmail) {
      user.email = normalizedEmail;
      user.emailVerified = false;
    }
    user.name = name.trim();
    user.phone = phone.trim();
    user.address = address.trim();
    user.photo = photo;
    saveDb(db);
    return publicUser(user);
  }

  // PUT /api/auth/password
  if (pathname === '/api/auth/password' && upperMethod === 'PUT') {
    const user = getAuthUser(db, token);
    const { currentPassword, newPassword } = payload;
    if (user.password !== String(currentPassword || '')) {
      throw new Error('Current password is incorrect');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    user.password = newPassword;
    saveDb(db);
    return { message: 'Password changed successfully' };
  }

  // POST /api/auth/email/send-verification
  if (pathname === '/api/auth/email/send-verification' && upperMethod === 'POST') {
    const user = getAuthUser(db, token);
    if (!user.email) throw new Error('Add an email address to your account first');
    user.emailVerified = true;
    saveDb(db);
    return { message: 'Email verified automatically (static demo mode without SMTP server).' };
  }

  // GET /api/auth/verify-email
  if (pathname === '/api/auth/verify-email' && upperMethod === 'GET') {
    const verifyToken = params.get('token') || '';
    if (!verifyToken) throw new Error('Verification link is invalid or expired');
    return { message: 'Email verified successfully' };
  }

  // POST /api/auth/forgot-password
  if (pathname === '/api/auth/forgot-password' && upperMethod === 'POST') {
    return {
      message: 'If this email belongs to a verified account, a password reset link has been sent.',
    };
  }

  // POST /api/auth/reset-password
  if (pathname === '/api/auth/reset-password' && upperMethod === 'POST') {
    const { newPassword } = payload;
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    throw new Error('Reset link is invalid or expired. Connect the backend SMTP server for email reset links.');
  }

  // GET /api/reviews
  if (pathname === '/api/reviews' && upperMethod === 'GET') {
    return [...db.reviews]
      .sort((a, b) => b.id - a.id)
      .map((r) => {
        const author = db.users.find((u) => u.id === r.userId);
        return {
          id: r.id,
          rating: r.rating,
          text: r.text,
          createdAt: r.createdAt,
          name: author?.name || r.name || 'Guest',
          photo: author?.photo || r.photo || null,
        };
      });
  }

  // POST /api/reviews
  if (pathname === '/api/reviews' && upperMethod === 'POST') {
    const user = getAuthUser(db, token);
    if (user.role !== 'client') throw new Error('Only customer accounts can post reviews');
    if (!user.photo) {
      throw new Error('Upload a profile photo in Account settings before posting a review');
    }
    const rating = Number(payload.rating);
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text || text.length > 1000) {
      throw new Error('A review (up to 1000 characters) and a rating from 1 to 5 are required');
    }
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const review = {
      id: db.nextReviewId++,
      userId: user.id,
      rating,
      text,
      createdAt,
      name: user.name,
      photo: user.photo,
    };
    db.reviews.push(review);
    saveDb(db);
    return {
      id: review.id,
      rating: review.rating,
      text: review.text,
      createdAt: review.createdAt,
      name: user.name,
      photo: user.photo,
    };
  }

  // GET /api/orders
  if (pathname === '/api/orders' && upperMethod === 'GET') {
    const user = getAuthUser(db, token);
    const list =
      user.role === 'administrator'
        ? db.orders
        : db.orders.filter((o) => o.userId === user.id || o.username === user.username);
    return [...list];
  }

  // POST /api/orders
  if (pathname === '/api/orders' && upperMethod === 'POST') {
    const user = getAuthUser(db, token);
    if (user.role !== 'client') throw new Error('Forbidden');
    const { items: requestedItems, type, location, notes = '', payment } = payload;
    if (!Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 30) {
      throw new Error('Your cart is empty or contains too many items');
    }
    if (!['Delivery', 'Dine-in'].includes(type) || typeof location !== 'string' || !location.trim() || location.length > 500) {
      throw new Error('A valid order type and destination are required');
    }
    if (!['Cash', 'QRIS', 'Bank transfer'].includes(payment)) {
      throw new Error('Choose a valid payment method');
    }
    if (typeof notes !== 'string' || notes.length > 500) {
      throw new Error('Order notes must be under 500 characters');
    }

    const catalog = getCatalogDishes();
    const items = [];
    for (const item of requestedItems) {
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99 || typeof item.name !== 'string') {
        throw new Error('One of the cart items is invalid');
      }
      const dish = catalog.find((d) => d.name.toLowerCase() === item.name.toLowerCase());
      if (!dish) throw new Error(`Dish not found: ${item.name}`);
      items.push({ id: dish.id, name: dish.name, qty: item.qty, price: dish.price });
    }

    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const code = `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    const order = {
      id: code,
      userId: user.id,
      username: user.username,
      customer: user.name,
      type,
      location: location.trim(),
      notes: notes.trim(),
      payment,
      total,
      status: 'New',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      items,
    };
    db.orders.unshift(order);
    saveDb(db);
    return order;
  }

  // PATCH /api/orders/:code/status
  const statusMatch = pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (statusMatch && upperMethod === 'PATCH') {
    const user = getAuthUser(db, token);
    if (user.role !== 'administrator') throw new Error('Forbidden');
    const code = decodeURIComponent(statusMatch[1]);
    const allowed = ['New', 'Preparing', 'On the way', 'Completed', 'Cancelled'];
    if (!allowed.includes(payload.status)) throw new Error('Invalid order status');
    const order = db.orders.find((o) => o.id === code);
    if (!order) throw new Error('Order not found');
    order.status = payload.status;
    saveDb(db);
    return order;
  }

  throw new Error(`Unsupported endpoint: ${upperMethod} ${pathname}`);
}
