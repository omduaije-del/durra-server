// Minimal API for Durra — إجابات صحيحة عبر OpenAI
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// middlewares
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: "*", credentials: false }));

// health
app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "server running" });
});

// ask (يستدعي OpenAI ليرد على سؤال رياضي بدقة)
app.post("/ask", async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ error: "رجاءً اكتب سؤالًا." });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "مفقود OPENAI_API_KEY على السيرفر." });
    }

    // نستخدم fetch المدمج في Node 18+ (Render عندك Node 22)
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2, // دقة عالية
        messages: [
          {
            role: "system",
            content:
              "أنت معلمة رياضيات عربية دقيقة جدًا. أجيبي بإيجاز وبخطوات واضحة عند الحاجة. إذا كان السؤال غير رياضي فقولي: (أنا مختصة بالرياضيات فقط).",
          },
          { role: "user", content: question },
        ],
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      // في حال خطأ من OpenAI
      const msg = data?.error?.message || "تعذر الحصول على إجابة من النموذج.";
      return res.status(502).json({ error: msg });
    }

    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "لم أستطع توليد إجابة.";

    return res.json({ answer });
  } catch (err) {
    console.error("ASK_ERROR:", err);
    return res.status(500).json({ error: "حدث خطأ في السيرفر." });
  }
});

// (اختياري) GET للتجربة اليدوية
app.get("/ask", (_req, res) => {
  res.json({ msg: "أرسل POST على /ask مع {question: '...'}" });
});

// run
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
