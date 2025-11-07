const express = require("express");
const cors = require("cors");

// Node 20+ فيه fetch جاهز (Render يستخدم نسخة حديثة)
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS متسامح لموقعك
app.use(cors({
  origin: true,
  credentials: false
}));

// صفحة رئيسية بسيطة
app.get("/", (req, res) => {
  res.send("durra-server is running.");
});

// فحص الصحة
app.get("/health", (req, res) => {
  res.json({ ok: true, status: "server running" });
});

// المعالج العام للأسئلة (يدعم GET وPOST وأسماء حقول مختلفة)
const askHandler = async (req, res) => {
  try {
    const body = req.body || {};
    const question =
      body.question ||
      body.q ||
      req.query?.q ||
      req.query?.question;

    if (!question) {
      return res.status(400).json({ ok: false, error: "No question provided" });
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: `أجب بإيجاز وبالعربية فقط: ${question}`
      })
    });

    const data = await r.json();

    // نحاول استخراج النص من صيغ متعددة
    let text = "";
    if (Array.isArray(data?.output)) {
      const first = data.output[0];
      if (Array.isArray(first?.content) && first.content[0]?.text) {
        text = first.content[0].text;
      }
    }
    if (!text && data?.choices?.[0]?.message?.content) {
      text = data.choices[0].message.content;
    }
    if (!text) text = "لم أتمكن من توليد إجابة الآن.";

    // نعيد مفاتيح متعددة عشان أي واجهة تفهم
    return res.json({
      ok: true,
      answer: text,
      message: text,
      content: text,
      text,
      result: text,
      data: { text }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
};

// مسارات POST
app.post("/api/ask", askHandler);
app.post("/ask", askHandler);
app.post("/v1/ask", askHandler);

// ومسارات GET أيضاً
app.get("/api/ask", askHandler);
app.get("/ask", askHandler);
app.get("/v1/ask", askHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
