import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { resolveImageUrl } from '../storage.js';

const router = Router();

router.post('/', auth, async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    const url = await resolveImageUrl(image);
    res.status(201).json({ url });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Image upload failed' });
  }
});

export default router;
