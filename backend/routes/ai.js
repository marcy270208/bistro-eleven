import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

function parseIngredients(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function optionalUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function loadRestaurantContext() {
  const rawDishes = await db.all(
    'SELECT id, name, description, ingredients, price, image FROM dishes ORDER BY id'
  );
  const dishes = rawDishes.map((d) => ({
    ...d,
    ingredients: parseIngredients(d.ingredients),
  }));

  const reviews = await db.all(
    `SELECT r.id, r.rating, r.text, r.created_at AS createdAt, u.name AS author
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     ORDER BY r.id DESC
     LIMIT 25`
  );

  const topOrdered = await db.all(
    `SELECT d.id, d.name, SUM(oi.qty) AS totalQty
     FROM order_items oi
     JOIN dishes d ON d.id = oi.dish_id
     GROUP BY d.id, d.name
     ORDER BY totalQty DESC
     LIMIT 3`
  );

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return { dishes, reviews, topOrdered, avgRating };
}

function buildSmartReply(message, context) {
  const q = message.toLowerCase();
  const { dishes, reviews, topOrdered, avgRating } = context;

  // Detect questions that should be escalated or offered to the Head Chef
  const chefKeywords = [
    'chef',
    'koki',
    'custom',
    'modifikasi',
    'request khusus',
    'alergi parah',
    'cross contamination',
    'kontaminasi',
    'resep rahasia',
    'cara masak',
    'katering',
    'catering',
    'ulang tahun',
    'reservasi',
    'booking',
    'gluten free',
    'vegan',
    'bebas gluten',
    'tanya chef',
    'hubungi chef',
    'admin',
  ];
  const explicitChefRequest = chefKeywords.some((kw) => q.includes(kw));

  // Match specific dishes mentioned in the message
  const matchedDishes = dishes.filter((d) => {
    const words = d.name.toLowerCase().split(/\s+/);
    return (
      q.includes(d.name.toLowerCase()) ||
      words.some((w) => w.length >= 4 && q.includes(w))
    );
  });

  // 1. Review summary request
  if (
    q.includes('review') ||
    q.includes('ulasan') ||
    q.includes('rating') ||
    q.includes('testimoni') ||
    q.includes('komentar') ||
    q.includes('pendapat')
  ) {
    if (!reviews.length) {
      return {
        reply:
          'Saat ini belum ada ulasan pelanggan yang tercatat di database Bistro Eleven. Namun menu favorit yang paling sering dipesan adalah **Classic Club Sandwich** (Rp 20.000) dan **Spaghetti Bolognese** (Rp 30.000). Apakah kamu ingin rekomendasi menu atau bertanya langsung ke Chef kami?',
        recommendedDishes: dishes.slice(0, 2),
        needsChef: false,
      };
    }
    const star5 = reviews.filter((r) => Number(r.rating) === 5).length;
    const star4 = reviews.filter((r) => Number(r.rating) === 4).length;
    const recentHighlights = reviews
      .slice(0, 3)
      .map((r) => `• **${r.author}** (${'★'.repeat(r.rating)}): *"${r.text}"*`)
      .join('\n');

    return {
      reply:
        `📊 **Ringkasan Review Pelanggan Bistro Eleven**\n` +
        `Dari **${reviews.length} ulasan terbaru** di server kami, rata-rata rating restoran adalah **⭐ ${avgRating} / 5.0** (${star5} ulasan bintang 5, ${star4} ulasan bintang 4).\n\n` +
        `**Sorotan Ulasan Terbaru:**\n${recentHighlights}\n\n` +
        `Pelanggan paling banyak memuji rasa makanan yang fresh, porsi yang mengenyangkan, dan harga yang ramah di kantong.`,
      recommendedDishes: topOrdered.length
        ? dishes.filter((d) => topOrdered.some((t) => t.id === d.id))
        : dishes.slice(0, 2),
      needsChef: false,
    };
  }

  // 2. Explicit escalation / custom kitchen question
  if (explicitChefRequest) {
    return {
      reply:
        `Pertanyaan kamu menyangkut **permintaan khusus dapur / konsultasi langsung dengan Head Chef** (*"${message}"*).\n\n` +
        `Sebagai asisten AI menu, saya tidak bisa memutuskan perubahan resep khusus, jaminan alergi medis ketat, atau pesanan custom di luar katalog standar. Silakan klik tombol **"👨‍🍳 Alihkan & Kirim Pertanyaan ke Chef"** di bawah agar Head Chef kami bisa langsung membalas pesanmu dari dapur!`,
      recommendedDishes: matchedDishes.slice(0, 2),
      needsChef: true,
    };
  }

  // 3. Specific dish inquiry (ingredients, price, description)
  if (matchedDishes.length > 0) {
    const details = matchedDishes
      .map(
        (d) =>
          `🍽️ **${d.name}** — **Rp ${Number(d.price).toLocaleString('id-ID')}**\n` +
          `• Deskripsi: ${d.description}\n` +
          `• Komposisi/Bahan: ${d.ingredients.length ? d.ingredients.join(', ') : 'Bahan segar pilihan Bistro Eleven'}`
      )
      .join('\n\n');

    return {
      reply:
        `Berikut informasi lengkap untuk menu yang kamu tanyakan:\n\n${details}\n\n` +
        `Jika kamu punya permintaan modifikasi bahan (misalnya tanpa bahan tertentu) yang perlu dikonfirmasi dapur, kamu juga bisa meneruskan pertanyaan ini langsung ke Chef kami.`,
      recommendedDishes: matchedDishes.slice(0, 3),
      needsChef: false,
    };
  }

  // 4. Budget / cheap / affordable filter
  if (
    q.includes('murah') ||
    q.includes('hemat') ||
    q.includes('budget') ||
    q.includes('harga') ||
    q.includes('dibawah') ||
    q.includes('di bawah') ||
    q.includes('20') ||
    q.includes('25')
  ) {
    const affordable = [...dishes].sort((a, b) => a.price - b.price).slice(0, 3);
    const list = affordable
      .map((d) => `• **${d.name}** (Rp ${Number(d.price).toLocaleString('id-ID')}) — ${d.description}`)
      .join('\n');
    return {
      reply: `💸 **Rekomendasi Menu Hemat di Bistro Eleven:**\n\n${list}\n\nSemuanya dibuat fresh saat dipesan!`,
      recommendedDishes: affordable,
      needsChef: false,
    };
  }

  // 5. Sweet / dessert / cake / pancake
  if (
    q.includes('manis') ||
    q.includes('dessert') ||
    q.includes('penutup') ||
    q.includes('coklat') ||
    q.includes('chocolate') ||
    q.includes('kue')
  ) {
    const sweets = dishes.filter((d) =>
      /cake|pancake|smoothie|chocolate|berry/i.test(`${d.name} ${d.description}`)
    );
    const list = sweets
      .map((d) => `• **${d.name}** (Rp ${Number(d.price).toLocaleString('id-ID')}) — ${d.description}`)
      .join('\n');
    return {
      reply: `🍰 **Rekomendasi Menu Manis & Dessert Favorit:**\n\n${list}`,
      recommendedDishes: sweets.slice(0, 3),
      needsChef: false,
    };
  }

  // 6. Drinks / segar / minuman
  if (
    q.includes('minum') ||
    q.includes('segar') ||
    q.includes('drink') ||
    q.includes('haus') ||
    q.includes('juice') ||
    q.includes('jus') ||
    q.includes('smoothie')
  ) {
    const drinks = dishes.filter((d) =>
      /juice|smoothie|orange|strawberry|drink/i.test(`${d.name} ${d.description}`)
    );
    const list = drinks
      .map((d) => `• **${d.name}** (Rp ${Number(d.price).toLocaleString('id-ID')}) — ${d.description}`)
      .join('\n');
    return {
      reply: `🥤 **Pilihan Minuman Segar Bistro Eleven:**\n\n${list}`,
      recommendedDishes: drinks.slice(0, 3),
      needsChef: false,
    };
  }

  // 7. Heavy / savory / kenyang / makan siang / makan malam / rekomendasi umum
  if (
    q.includes('rekomendasi') ||
    q.includes('pesan apa') ||
    q.includes('kenyang') ||
    q.includes('makan') ||
    q.includes('menu') ||
    q.includes('favorit') ||
    q.includes('best seller') ||
    q.includes('terlaris') ||
    q.includes('halo') ||
    q.includes('hai')
  ) {
    const mains = dishes.filter((d) =>
      /sandwich|spaghetti|chicken|pizza/i.test(`${d.name} ${d.description}`)
    );
    const picks = mains.length ? mains.slice(0, 3) : dishes.slice(0, 3);
    const list = picks
      .map(
        (d) =>
          `• **${d.name}** (Rp ${Number(d.price).toLocaleString('id-ID')}) — ${d.description}`
      )
      .join('\n');
    return {
      reply:
        `Halo! 👋 Berikut **Rekomendasi Menu Andalan Bistro Eleven** yang paling disukai pelanggan${avgRating ? ` (Rating Restoran ⭐ ${avgRating}/5)` : ''}:\n\n` +
        `${list}\n\n` +
        `Kamu juga bisa tanya tentang **komposisi bahan**, **ringkasan review pelanggan**, atau **alihkan ke Chef** jika ada request masakan khusus!`,
      recommendedDishes: picks,
      needsChef: false,
    };
  }

  // 8. Unknown / out-of-scope question -> offer Chef escalation!
  return {
    reply:
      `Saya belum menemukan jawaban pasti untuk pertanyaan *"${message}"* dari data katalog menu standar kami.\n\n` +
      `Untuk pertanyaan khusus seperti ini, kamu bisa langsung **mengalihkan pertanyaan ke Head Chef** kami dengan menekan tombol **"👨‍🍳 Alihkan & Tanya ke Chef"** di bawah agar dijawab langsung oleh dapur Bistro Eleven!`,
    recommendedDishes: dishes.slice(0, 2),
    needsChef: true,
  };
}

async function callExternalAiModel(message, history, context) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const menuText = context.dishes
    .map(
      (d) =>
        `- [ID:${d.id}] ${d.name} (Rp ${d.price}): ${d.description} | Ingredients: ${d.ingredients.join(', ')}`
    )
    .join('\n');

  const reviewText = context.reviews.length
    ? `Average Rating: ${context.avgRating}/5 (${context.reviews.length} reviews).\nRecent reviews:\n` +
      context.reviews
        .slice(0, 8)
        .map((r) => `- ${r.author} (${r.rating}/5): "${r.text}"`)
        .join('\n')
    : 'No reviews yet.';

  const systemPrompt = `You are the Bistro Eleven AI Menu & Review Concierge.
Answer concisely in Indonesian (unless the user writes in English).
Use ONLY the real Bistro Eleven menu and customer reviews below:

MENU:
${menuText}

CUSTOMER REVIEWS:
${reviewText}

Rules:
1. Recommend specific dishes with their exact price in IDR (Rp).
2. Summarize customer reviews accurately when asked.
3. If the user asks for off-menu customizations, strict medical allergy guarantees, catering, reservations, secret kitchen techniques, or anything you cannot verify from the menu/reviews, tell them politely that you cannot confirm it yourself and recommend escalating to the Head Chef, and end your message with the exact tag [NEEDS_CHEF].`;

  if (geminiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...(Array.isArray(history)
                ? history.slice(-6).map((m) => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: String(m.text || '') }],
                  }))
                : []),
              { role: 'user', parts: [{ text: message }] },
            ],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (rawText) {
          const needsChef = rawText.includes('[NEEDS_CHEF]');
          const cleanReply = rawText.replace(/\[NEEDS_CHEF\]/g, '').trim();
          const mentioned = context.dishes.filter((d) =>
            cleanReply.toLowerCase().includes(d.name.toLowerCase())
          );
          return {
            reply: cleanReply,
            recommendedDishes: mentioned.slice(0, 3),
            needsChef,
          };
        }
      }
    } catch {
      // fall through to smart fallback
    } finally {
      clearTimeout(timer);
    }
  }

  if (openaiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content?.trim();
        if (rawText) {
          const needsChef = rawText.includes('[NEEDS_CHEF]');
          const cleanReply = rawText.replace(/\[NEEDS_CHEF\]/g, '').trim();
          const mentioned = context.dishes.filter((d) =>
            cleanReply.toLowerCase().includes(d.name.toLowerCase())
          );
          return {
            reply: cleanReply,
            recommendedDishes: mentioned.slice(0, 3),
            needsChef,
          };
        }
      }
    } catch {
      // fall through
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

router.post('/chat', async (req, res) => {
  try {
    const message = req.body?.message?.trim();
    if (!message || message.length > 600) {
      return res.status(400).json({ error: 'Tulis pertanyaan antara 1 hingga 600 karakter.' });
    }

    const context = await loadRestaurantContext();
    const llmResult = await callExternalAiModel(message, req.body?.history, context);
    const result = llmResult || buildSmartReply(message, context);

    res.json({
      reply: result.reply,
      recommendedDishes: result.recommendedDishes || [],
      needsChef: Boolean(result.needsChef),
      originalQuestion: message,
    });
  } catch {
    res.status(500).json({ error: 'Asisten AI sedang sibuk, silakan coba lagi atau tanya ke Chef.' });
  }
});

router.post('/escalate', async (req, res) => {
  try {
    const userPayload = optionalUser(req);
    const question = req.body?.question?.trim();
    const aiContext = req.body?.aiContext?.trim() || null;
    const guestName = req.body?.customerName?.trim();

    if (!question || question.length > 600) {
      return res.status(400).json({ error: 'Pertanyaan untuk Chef wajib diisi (maks 600 karakter).' });
    }

    let customerName = guestName || 'Pelanggan Bistro';
    let username = null;
    let userId = null;

    if (userPayload?.id) {
      const dbUser = await db.get('SELECT id, username, name FROM users WHERE id = ?', userPayload.id);
      if (dbUser) {
        userId = dbUser.id;
        username = dbUser.username;
        customerName = dbUser.name;
      }
    }

    const info = await db.run(
      `INSERT INTO chef_inquiries (user_id, customer_name, username, question, ai_context, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      userId,
      customerName,
      username,
      question,
      aiContext
    );

    const created = await db.get(
      `SELECT id, user_id AS userId, customer_name AS customerName, username, question,
              ai_context AS aiContext, chef_reply AS chefReply, status,
              created_at AS createdAt, replied_at AS repliedAt
       FROM chef_inquiries WHERE id = ?`,
      info.lastInsertRowid
    );

    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: 'Gagal mengirim pertanyaan ke Chef.' });
  }
});

router.get('/inquiries', auth, async (req, res) => {
  try {
    if (req.user.role === 'administrator') {
      const rows = await db.all(
        `SELECT id, user_id AS userId, customer_name AS customerName, username, question,
                ai_context AS aiContext, chef_reply AS chefReply, status,
                created_at AS createdAt, replied_at AS repliedAt
         FROM chef_inquiries
         ORDER BY CASE WHEN status = 'Pending' THEN 0 ELSE 1 END, id DESC`
      );
      return res.json(rows);
    }

    const rows = await db.all(
      `SELECT id, user_id AS userId, customer_name AS customerName, username, question,
              ai_context AS aiContext, chef_reply AS chefReply, status,
              created_at AS createdAt, replied_at AS repliedAt
       FROM chef_inquiries
       WHERE user_id = ? OR LOWER(username) = LOWER(?)
       ORDER BY id ASC`,
      req.user.id,
      req.user.username || ''
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Gagal memuat daftar pertanyaan Chef.' });
  }
});

router.get('/inquiries/:id', async (req, res) => {
  try {
    const row = await db.get(
      `SELECT id, user_id AS userId, customer_name AS customerName, username, question,
              ai_context AS aiContext, chef_reply AS chefReply, status,
              created_at AS createdAt, replied_at AS repliedAt
       FROM chef_inquiries WHERE id = ?`,
      req.params.id
    );
    if (!row) return res.status(404).json({ error: 'Pertanyaan tidak ditemukan.' });
    res.json(row);
  } catch {
    res.status(500).json({ error: 'Gagal memuat status pertanyaan Chef.' });
  }
});

router.post('/inquiries/:id/reply', auth, requireRole('administrator'), async (req, res) => {
  try {
    const reply = req.body?.reply?.trim();
    if (!reply || reply.length > 1000) {
      return res.status(400).json({ error: 'Jawaban Chef wajib diisi (maks 1000 karakter).' });
    }

    const existing = await db.get('SELECT id FROM chef_inquiries WHERE id = ?', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Pertanyaan pelanggan tidak ditemukan.' });
    }

    await db.run(
      `UPDATE chef_inquiries
       SET chef_reply = ?, status = 'Answered', replied_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      reply,
      req.params.id
    );

    const updated = await db.get(
      `SELECT id, user_id AS userId, customer_name AS customerName, username, question,
              ai_context AS aiContext, chef_reply AS chefReply, status,
              created_at AS createdAt, replied_at AS repliedAt
       FROM chef_inquiries WHERE id = ?`,
      req.params.id
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Gagal menyimpan jawaban Chef.' });
  }
});

export default router;
