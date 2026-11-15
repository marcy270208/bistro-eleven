import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dishRoutes from './routes/dishes.js';
import reviewRoutes from './routes/reviews.js';
import orderRoutes from './routes/orders.js';
import uploadRoutes from './routes/upload.js';
import aiRoutes from './routes/ai.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a random value with at least 32 characters in backend/.env');
}

const app = express();
const defaultAllowedOrigins = [
  'https://marcy270208.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:8081',
];
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const appOrigin = (() => {
  try {
    return process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;
  } catch {
    return null;
  }
})();
const allowedOrigins = new Set([...defaultAllowedOrigins, ...envOrigins, ...(appOrigin ? [appOrigin] : [])]);

app.use(
  cors({
    origin(origin, callback) {
      // Allow mobile apps / curl (no Origin header) and any configured web origin
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '6mb' }));

app.get('/', (_req, res) => res.json({ status: 'Bistro Eleven API running' }));
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  app.listen(port, (err) => {
    if (err) {
      console.error('Cannot start server:', err.message);
      process.exit(1);
    }
    console.log(`API running on http://localhost:${port}`);
  });
}

export default app;
