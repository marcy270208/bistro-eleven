import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dishRoutes from './routes/dishes.js';
import reviewRoutes from './routes/reviews.js';
import orderRoutes from './routes/orders.js';
import uploadRoutes from './routes/upload.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a random value with at least 32 characters in backend/.env');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));

app.get('/', (_req, res) => res.json({ status: 'Bistro Eleven API running' }));
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);

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
