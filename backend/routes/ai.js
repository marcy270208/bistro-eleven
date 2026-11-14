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

function buildSmartReply(message, context, lang = 'en') {
  const isId = lang === 'id';
  const q = message.toLowerCase();
  const { dishes, reviews, topOrdered, avgRating } = context;

  const chefKeywords = [
    'chef',
    'koki',
    'custom',
    'modify',
    'modification',
    'modifikasi',
    'special request',
    'request khusus',
    'allergy',
    'allergies',
    'alergi',
    'cross contamination',
    'kontaminasi',
    'secret recipe',
    'resep rahasia',
    'catering',
    'katering',
    'birthday',
    'ulang tahun',
    'reservation',
    'reservasi',
    'booking',
    'gluten free',
    'vegan',
    'bebas gluten',
    'ask chef',
    'tanya chef',
    'speak to chef',
  ];
  const explicitChefRequest = chefKeywords.some((kw) => q.includes(kw));

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
    q.includes('testimonial') ||
    q.includes('testimoni') ||
    q.includes('feedback') ||
    q.includes('pendapat')
  ) {
    if (!reviews.length) {
      return {
        reply: isId
          ? 'Saat ini belum ada ulasan pelanggan di database Bistro Eleven. Namun menu favorit yang paling sering dipesan adalah **Classic Club Sandwich** (Rp 20.000) dan **Spaghetti Bolognese** (Rp 30.000). Apakah kamu ingin rekomendasi menu atau bertanya langsung ke Chef kami?'
          : 'There are no guest reviews recorded in the Bistro Eleven database yet. However, our most ordered house favorites are the **Classic Club Sandwich** (Rp 20,000) and **Spaghetti Bolognese** (Rp 30,000). Would you like dish recommendations or to ask our Head Chef directly?',
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
      reply: isId
        ? `📊 **Ringkasan Review Pelanggan Bistro Eleven**\nDari **${reviews.length} ulasan terbaru** di server kami, rata-rata rating restoran adalah **⭐ ${avgRating} / 5.0** (${star5} bintang 5, ${star4} bintang 4).\n\n**Sorotan Ulasan Terbaru:**\n${recentHighlights}\n\nPelanggan paling banyak memuji kesegaran bahan, porsi yang mengenyangkan, dan harga yang terjangkau.`
        : `📊 **Bistro Eleven Guest Review Summary**\nBased on **${reviews.length} recent reviews** in our server database, our average rating is **⭐ ${avgRating} / 5.0** (${star5} five-star reviews, ${star4} four-star reviews).\n\n**Recent Guest Highlights:**\n${recentHighlights}\n\nGuests consistently praise our fresh ingredients, generous portions, and friendly prices.`,
      recommendedDishes: topOrdered.length
        ? dishes.filter((d) => topOrdered.some((t) => t.id === d.id))
        : dishes.slice(0, 2),
      needsChef: false,
    };
  }

  // 2. Explicit escalation / custom kitchen question
  if (explicitChefRequest) {
    return {
      reply: isId
        ? `Pertanyaanmu menyangkut **permintaan khusus dapur / konsultasi langsung dengan Head Chef** (*"${message}"*).\n\nSebagai asisten AI, saya tidak dapat mengonfirmasi modifikasi resep khusus, jaminan medis alergi silang, atau pesanan di luar menu standar. Silakan klik tombol **"👨‍🍳 Alihkan & Tanya ke Chef"** di bawah agar Head Chef kami langsung membalas pesanmu dari dapur!`
        : `Your question involves a **custom kitchen request or direct consultation with our Head Chef** (*"${message}"*).\n\nAs an AI menu assistant, I cannot confirm off-menu recipe modifications, strict medical cross-contamination guarantees, or custom event orders on my own. Please click **"👨‍🍳 Escalate & Ask Head Chef"** below so our Head Chef can reply directly from the kitchen!`,
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
          (isId
            ? `• Deskripsi: ${d.description}\n• Bahan/Komposisi: ${d.ingredients.length ? d.ingredients.join(', ') : 'Bahan segar pilihan Bistro Eleven'}`
            : `• Description: ${d.description}\n• Ingredients: ${d.ingredients.length ? d.ingredients.join(', ') : 'Fresh Bistro Eleven kitchen ingredients'}`)
      )
      .join('\n\n');

    return {
      reply: isId
        ? `Berikut informasi lengkap untuk menu yang kamu tanyakan:\n\n${details}\n\nJika kamu ingin memodifikasi bahan tertentu, kamu juga bisa meneruskan pertanyaan ini ke Head Chef kami.`
        : `Here are the full details for the dish you asked about:\n\n${details}\n\nIf you need a custom ingredient modification confirmed by the kitchen, you can escalate this question to our Head Chef below.`,
      recommendedDishes: matchedDishes.slice(0, 3),
      needsChef: false,
    };
  }

  // 4. Budget / cheap / affordable filter
  if (
    q.includes('cheap') ||
    q.includes('budget') ||
    q.includes('affordable') ||
    q.includes('under') ||
    q.includes('price') ||
    q.includes('murah') ||
    q.includes('hemat') ||
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
      reply: isId
        ? `💸 **Rekomendasi Menu Hemat di Bistro Eleven:**\n\n${list}\n\nSemuanya disiapkan segar saat dipesan!`
        : `💸 **Best Budget-Friendly Picks at Bistro Eleven:**\n\n${list}\n\nEvery dish is freshly prepared to order!`,
      recommendedDishes: affordable,
      needsChef: false,
    };
  }

  // 5. Sweet / dessert / cake / pancake
  if (
    q.includes('sweet') ||
    q.includes('dessert') ||
    q.includes('cake') ||
    q.includes('pancake') ||
    q.includes('chocolate') ||
    q.includes('manis') ||
    q.includes('penutup') ||
    q.includes('coklat') ||
    q.includes('kue')
  ) {
    const sweets = dishes.filter((d) =>
      /cake|pancake|smoothie|chocolate|berry/i.test(`${d.name} ${d.description}`)
    );
    const list = sweets
      .map((d) => `• **${d.name}** (Rp ${Number(d.price).toLocaleString('id-ID')}) — ${d.description}`)
      .join('\n');
    return {
      reply: isId
        ? `🍰 **Rekomendasi Dessert & Menu Manis Favorit:**\n\n${list}`
        : `🍰 **Recommended Sweet Treats & Desserts:**\n\n${list}`,
      recommendedDishes: sweets.slice(0, 3),
      needsChef: false,
    };
  }

  // 6. Drinks / beverages
  if (
    q.includes('drink') ||
    q.includes('beverage') ||
    q.includes('refreshing') ||
    q.includes('thirsty') ||
    q.includes('juice') ||
    q.includes('smoothie') ||
    q.includes('minum') ||
    q.includes('segar') ||
    q.includes('haus') ||
    q.includes('jus')
  ) {
    const drinks = dishes.filter((d) =>
      /juice|smoothie|orange|strawberry|drink/i.test(`${d.name} ${d.description}`)
    );
    const list = drinks
      .map((d) => `• **${d.name}** (Rp ${Number(d.price).toLocaleString('id-ID')}) — ${d.description}`)
      .join('\n');
    return {
      reply: isId
        ? `🥤 **Pilihan Minuman Segar Bistro Eleven:**\n\n${list}`
        : `🥤 **Refreshing Drinks at Bistro Eleven:**\n\n${list}`,
      recommendedDishes: drinks.slice(0, 3),
      needsChef: false,
    };
  }

  // 7. General recommendation / popular / savory / mains
  if (
    q.includes('recommend') ||
    q.includes('popular') ||
    q.includes('favorite') ||
    q.includes('favourite') ||
    q.includes('best') ||
    q.includes('order') ||
    q.includes('menu') ||
    q.includes('hungry') ||
    q.includes('lunch') ||
    q.includes('dinner') ||
    q.includes('hello') ||
    q.includes('hi') ||
    q.includes('rekomendasi') ||
    q.includes('pesan') ||
    q.includes('kenyang') ||
    q.includes('makan') ||
    q.includes('favorit') ||
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
      reply: isId
        ? `Halo! 👋 Berikut **Rekomendasi Menu Andalan Bistro Eleven** yang paling disukai pelanggan${avgRating ? ` (Rating Restoran ⭐ ${avgRating}/5)` : ''}:\n\n${list}\n\nKamu juga bisa tanya tentang **komposisi bahan**, **ringkasan review pelanggan**, atau **alihkan ke Chef** jika ada request masakan khusus!`
        : `Hello! 👋 Here are **Bistro Eleven's Signature House Favorites** loved by our guests${avgRating ? ` (Restaurant Rating ⭐ ${avgRating}/5)` : ''}:\n\n${list}\n\nYou can also ask about **dish ingredients**, a **summary of guest reviews**, or **escalate to our Head Chef** for special kitchen requests!`,
      recommendedDishes: picks,
      needsChef: false,
    };
  }

  // 8. Unknown / out-of-scope question -> offer Chef escalation!
  return {
    reply: isId
      ? `Saya belum menemukan jawaban pasti untuk pertanyaan *"${message}"* dari data katalog menu standar kami.\n\nUntuk pertanyaan khusus seperti ini, silakan tekan tombol **"👨‍🍳 Alihkan & Tanya ke Chef"** di bawah agar dijawab langsung oleh Head Chef Bistro Eleven!`
      : `I couldn't find an exact answer for *"${message}"* in our standard menu catalog.\n\nFor specific kitchen questions like this, please click **"👨‍🍳 Escalate & Ask Head Chef"** below so our Head Chef at Bistro Eleven can answer you directly!`,
    recommendedDishes: dishes.slice(0, 2),
    needsChef: true,
  };
}

async function callExternalAiModel(message, history, context, lang = 'en') {
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

  const targetLanguage = lang === 'id' ? 'Indonesian (Bahasa Indonesia)' : 'English';

  const systemPrompt = `You are the Bistro Eleven AI Menu & Review Concierge.
Always respond in ${targetLanguage}.
Use ONLY the real Bistro Eleven menu and customer reviews below:

MENU:
${menuText}

CUSTOMER REVIEWS:
${reviewText}

Rules:
1. Recommend specific dishes with their exact price in IDR (Rp).
2. Summarize customer reviews accurately when asked.
3. If the user asks for off-menu customizations, strict medical allergy guarantees, catering, reservations, secret kitchen techniques, or anything you cannot verify from the menu/reviews, politely recommend escalating to the Head Chef and end your message with the exact tag [NEEDS_CHEF].`;

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
      // fall through
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
    const lang = req.body?.lang === 'id' ? 'id' : 'en';
    if (!message || message.length > 600) {
      return res.status(400).json({
        error:
          lang === 'id'
            ? 'Tulis pertanyaan antara 1 hingga 600 karakter.'
            : 'Please enter a question between 1 and 600 characters.',
      });
    }

    const context = await loadRestaurantContext();
    const llmResult = await callExternalAiModel(message, req.body?.history, context, lang);
    const result = llmResult || buildSmartReply(message, context, lang);

    res.json({
      reply: result.reply,
      recommendedDishes: result.recommendedDishes || [],
      needsChef: Boolean(result.needsChef),
      originalQuestion: message,
    });
  } catch {
    res.status(500).json({
      error: 'AI Assistant is temporarily busy. Please try again or escalate to our Chef.',
    });
  }
});

router.post('/escalate', async (req, res) => {
  try {
    const userPayload = optionalUser(req);
    const question = req.body?.question?.trim();
    const aiContext = req.body?.aiContext?.trim() || null;
    const guestName = req.body?.customerName?.trim();

    if (!question || question.length > 600) {
      return res.status(400).json({ error: 'Question for the Chef is required (max 600 chars).' });
    }

    let customerName = guestName || 'Bistro Guest';
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
    res.status(500).json({ error: 'Could not send your question to the Chef.' });
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
    res.status(500).json({ error: 'Could not load Chef inquiries.' });
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
    if (!row) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json(row);
  } catch {
    res.status(500).json({ error: 'Could not load inquiry status.' });
  }
});

router.post('/inquiries/:id/reply', auth, requireRole('administrator'), async (req, res) => {
  try {
    const reply = req.body?.reply?.trim();
    if (!reply || reply.length > 1000) {
      return res.status(400).json({ error: 'Chef reply is required (max 1000 chars).' });
    }

    const existing = await db.get('SELECT id FROM chef_inquiries WHERE id = ?', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer inquiry not found.' });
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
    res.status(500).json({ error: 'Could not save Chef reply.' });
  }
});

export default router;
