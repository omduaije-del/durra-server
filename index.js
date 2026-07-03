const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json({ limit: "2mb" }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("Durra server is running");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    service: "durra-server",
    hasKey: !!OPENAI_API_KEY
  });
});

async function handleAsk(req, res) {
  try {
    const question =
      req.body.question ||
      req.body.message ||
      "";

    if (!question.trim()) {
      return res.status(400).json({
        error: "فضلاً اكتبي سؤال الرياضيات أولاً."
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY غير موجود في Render."
      });
    }

    console.log("Received question:", question);

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 900,
          messages: [
            {
              role: "system",
              content:
                "أنتِ دُرى، معلمة رياضيات عربية ذكية. أجيبي فقط عن أسئلة الرياضيات بالعربية بخطوات واضحة ومختصرة."
            },
            {
              role: "user",
              content: question
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log("OpenAI Response:", data);

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI Error",
        details: data
      });
    }

    const answer =
      data.choices?.[0]?.message?.content ||
      "لم يتم الحصول على إجابة.";

    return res.json({
      answer,
      reply: answer
    });

  } catch (err) {
    console.error("SERVER ERROR:");
    console.error(err);

    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
}

app.post("/ask", handleAsk);
app.post("/api/chat", handleAsk);

app.listen(PORT, () => {
  console.log(`Durra server running on port ${PORT}`);
});
