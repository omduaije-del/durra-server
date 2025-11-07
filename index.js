// Minimal, safe API for Render
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// middlewares
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: [
      "https://durra-public.onrender.com", // موقعك العام
      "http://localhost:5173"              // للتجربة محلياً لو احتجتِ
    ],
    credentials: false
  })
);

// health
app.get("/health", (req, res) => {
  res.json({ ok: true, status: "server running" });
});

// دالة مساعدة لاستدعاء OpenAI عبر fetch المدمج في Node 22
async function askOpenAI(question, lang = "ar") {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const systemPrompt =
    lang === "ar"
      ? "أجب عن أسئلة الرياضيات فقط وباختصار واضح باللغة العربية."
      : "Answer math questions only, briefly and clearly.";

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: Bearer ${OPENAI_API_KEY}
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.2
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(OpenAI error: ${resp.status} ${errText});
  }
  const data = await resp.json();
  const answer =
    data?.choices?.[0]?.message?.content?.trim() || "لم يصلني رد.";
  return answer;
}

// POST /ask للواجهة
app.post("/ask", async (req, res) => {
  try {
    const { question, lang } = req.body || {};
    if (!question || !question.trim())
      return res.status(400).json({ error: "question is required" });

    const answer = await askOpenAI(question.trim(), lang || "ar");
    res.json({ ok: true, answer });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// (اختياري للتجربة السريعة من المتصفح) GET /ask?q=...
app.get("/ask", async (req, res) => {
  try {
    const q = (req.query.q || "").toString();
    if (!q) return res.status(400).json({ error: "q is required" });
    const answer = await askOpenAI(q, "ar");
    res.json({ ok: true, answer });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(Server is running on port: ${PORT});
});
