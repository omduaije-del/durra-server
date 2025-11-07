import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(cors({ origin: ["https://durra-math.onrender.com", "http://localhost:5173"] }));

app.get("/", (req, res) => {
  res.send("durra-server is running.");
});

app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "No question" });

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
    let text = "";
    if (data?.output && Array.isArray(data.output)) {
      // Responses API format
      const first = data.output[0];
      if (first?.content && Array.isArray(first.content) && first.content[0]?.text) {
        text = first.content[0].text;
      }
    }
    if (!text && data?.choices && data.choices[0]?.message?.content) {
      // Chat Completions fallback (if API returns in another structure)
      text = data.choices[0].message.content;
    }
    res.json({ answer: text || "لم أتمكّن من توليد إجابة الآن." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("durra-server running on " + port));
