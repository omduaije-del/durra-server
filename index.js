const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: "*", credentials: false }));

app.get("/", (_req, res) => {
  res.send("Durra server is running");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", service: "durra-server" });
});

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function handleAsk(req, res) {
  try {
    const question = (
      req.body?.question ||
      req.body?.message ||
      ""
    ).toString().trim();

    if (!question) {
      return res.status(400).json({ error: "فضلاً اكتبي سؤال الرياضيات أولاً." });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "مفتاح OpenAI غير موجود في إعدادات الخادم.",
      });
    }

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "أنتِ دُرى، معلّمة رياضيات عربية ذكية. أجيبي فقط عن أسئلة الرياضيات بالعربية الفصحى المبسطة، بخطوات واضحة وقصيرة، وبدون ماركداون زائد.",
          },
          { role: "user", content: question },
        ],
      }),
    });

    const data = await readJsonSafe(apiRes);

    if (!apiRes.ok) {
      return res.status(502).json({
        error: data?.error?.message || "حدث خطأ من خدمة الذكاء الاصطناعي.",
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "لم أحصل على إجابة واضحة من النموذج.";

    return res.json({ answer, reply: answer });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "حدث خطأ غير متوقع في الخادم.",
    });
  }
}

app.post("/ask", handleAsk);
app.post("/api/chat", handleAsk);

app.listen(PORT, () => {
  console.log(`Durra server running on port ${PORT}`);
});
