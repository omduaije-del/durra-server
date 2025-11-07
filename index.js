// Minimal safe API for Render
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// اختبار السيرفر
app.get('/', (req, res) => {
  res.json({ ok: true, status: 'server running' });
});

// مثال على نداء API (لو بتحتاجي تستخدم الـ fetch)
app.post('/ask', async (req, res) => {
  const { prompt } = req.body;

  try {
    // نستخدم fetch المدمج في Node.js
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || 'No response' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching response from OpenAI API' });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
