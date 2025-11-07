// Minimal API for Durra — CommonJS style
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// فحص الصحة
app.get("/health", (req, res) => {
  res.json({ ok: true, status: "server running" });
});

// ميدلوير
app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: "*",      // مسموح من كل الدومينات (بسيط)
  credentials: false
}));

// نقطة الاستقبال /ask (تجريبي الآن)
app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "رجاءً أدخلي سؤال" });
    }

    // حالياً نرجّع رد تجريبي فوري — فقط للتأكد أن الواجهة تتصل بالسيرفر
    const answer = `إجابة تجريبية ✅: "${question}"`;
    return res.json({ answer });
  } catch (err) {
    console.error("ASK_ERROR:", err);
    res.status(500).json({ error: "حدث خطأ في السيرفر" });
  }
});

// تشغيل
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
