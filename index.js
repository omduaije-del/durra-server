// دُرّى — خادم مبسط لمعلّمة الرياضيات الذكية

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// نسمح للواجهة تتصل بالخادم
app.use(cors());
app.use(express.json());

// برومبت النظام: كيف نبي دُرّى تجاوب
const SYSTEM_PROMPT = `
أنت "دُرّى" معلمة رياضيات كويتية لطيفة للمرحلة المتوسطة والثانوية.

القواعد المهمة جداً لطريقة الإجابة:

- اشرحي بالعربية الفصحى المبسطة، مع أسلوب قريب من معلمات الكويت.
- استخدمي الأرقام العربية العادية أو الأرقام الهندية (١،٢،٣) حسب ما ترينه أوضح للطالبة.
- المتغيّر الرئيسي اكتبيه "س" بدلاً من x في جميع المعادلات قدر الإمكان.
- استخدمي الرموز الرياضية المعتادة فقط: +، −، ×، ÷، =، <، >، ≤، ≥.
- لا تكتبي كلمات إنجليزية داخل الحسابات مثل: div, rightarrow, sqrt, frac.
- ممنوع تماماً استخدام Markdown أو LaTeX أو كود:
  * لا تكتبي **نص غامق** أو عناوين #.
  * لا تكتبي \`code\` أو ``` أو \\frac أو \\sqrt أو \\cdot أو $$ أو \\[ أو \\].
- اكتبي الكسور بشكل خطي في سطر واحد مثل: ٣/٤ ، س/٢ ، ٥/٨.
- ابدئي الحل بتمهيد قصير يربط السؤال بالفكرة الرياضية.
- بعد ذلك استخدمي خطوات مرقمة بهذا الشكل (بدون نجوم ولا رموز غريبة):
  ١- ...
  ٢- ...
  ٣- ...
- إذا كان في السؤال خطأ أو غموض، نبّهي الطالبة بلطف، ثم صححي السؤال وقدمي حلاً مناسباً.
- في نهاية الإجابة ضعي سطراً مستقلّاً يبدأ بالكلمة: "النتيجة:" ثم اذكري النتيجة النهائية بوضوح.
- إذا كان المطلوب فقط قانون أو تعريف، اذكريه بصيغة واضحة ومختصرة، ثم إن احتجتِ أعطي مثالاً بسيطاً بعده.
- تجنّبي الحشو الزائد؛ خلي الشرح مرتب وواضح وقابل للقراءة على شاشة جوال أو لابتوب.
`;

// دالة استدعاء واجهة OpenAI
async function callOpenAI(message, history = []) {
  // نبني الرسائل: system + history + user
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: message },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // لازم يكون في env متغيّر OPENAI_API_KEY على Render
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OPENAI_ERROR", response.status, data);
    throw new Error("OPENAI_API_ERROR");
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("NO_REPLY");

  return reply;
}

// هالثابت عشان ما نسرّب رسائل الأخطاء الإنجليزية للمستخدمة
function buildSafeError() {
  return {
    error: "⚠️ الخادم مشغول حالياً أو حدث خطأ غير متوقع. حاولي مرة أخرى بعد قليل.",
  };
}

// نقطة صحّة الخادم
app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

// واجهة /api/chat (الأساسية)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ error: "الرجاء إرسال حقل 'message' كنص." });
    }

    // نتأكد من أن history مصفوفة رسائل بسيطة فقط
    let safeHistory = [];
    if (Array.isArray(history)) {
      safeHistory = history
        .filter(
          (m) =>
            m &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .map((m) => ({ role: m.role, content: m.content }));
    }

    const reply = await callOpenAI(message, safeHistory);
    res.json({ reply });
  } catch (err) {
    console.error("CHAT_ENDPOINT_ERROR", err);
    res.status(500).json(buildSafeError());
  }
});

// واجهة /ask القديمة للتوافق مع الواجهة الأمامية
app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res
        .status(400)
        .json({ error: "الرجاء إرسال حقل 'question' كنص." });
    }

    const reply = await callOpenAI(question, []);
    // بعض الواجهات كانت تتوقع { answer: ... }
    res.json({ answer: reply });
  } catch (err) {
    console.error("ASK_ENDPOINT_ERROR", err);
    res.status(500).json(buildSafeError());
  }
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Durra server running on port ${PORT}`);
});
