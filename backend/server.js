import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dishRoutes from './routes/dishes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.json({ status: 'Bistro Eleven API running' }));
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);

const port = process.env.PORT || 3001;
app.listen(port, (err) => {
  if (err) {
    console.error('Cannot start server:', err.message);
    process.exit(1);
  }
  console.log(`API running on http://localhost:${port}`);
});