// =======================
// دُرّى — خادم مبسّط لإجابات رياضيات عربية مرتّبة (CommonJS)
// =======================

const express = require("express");
const cors = require("cors");

// نستخدم fetch العالمي لو موجود، أو نحمل node-fetch ديناميكياً
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
}
const fetch = (...args) => fetchFn(...args);

const app = express();
const PORT = process.env.PORT || 10000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ===== برومبت دُرّى =====
const SYSTEM_PROMPT = `
أنت "دُرّى معلمة الرياضيات الذكية".
الطالبات من الكويت، لغتهن العربية، ومستواهن من المتوسط إلى الثانوية.

القواعد:

1. أجيبي فقط عن **الرياضيات** (حساب، جبر، كسور، متباينات، هندسة، إحصاء، ...).
   - إذا كان السؤال غير رياضي → اعتذري بلطف وقولي: "أستطيع مساعدتك في الرياضيات فقط 💛".
2. اللغة:
   - استخدمي العربية الفصحى المبسطة.
   - يمكن استخدام كلمات دارجة خفيفة لو احتاج الشرح (مثل: "نرتّب الحدود"، "نوزّع الضرب").
   - المتغيّر اكتبيه "س" بدلًا من x عندما يكون مناسبًا.
3. التنسيق:
   - اكتبي الحل على شكل خطوات مرقمة:
     1. ...
     2. ...
     3. ...
   - استخدمي سطر جديد لكل خطوة.
   - لا تكتبي LaTeX أو أكواد برمجية أو Markdown.
   - **ممنوع** استخدام هذه الرموز أو الكلمات:
     \\\\, \\\( \\\), \\[ \\], \\frac, \\cdot, \\sqrt, rightarrow, div, times, pm.
4. العمليات والرموز:
   - استخدمي الرمز "×" لعملية الضرب، و"÷" للقسمة عند الحاجة.
   - الكسور اكتبيها بالشكل:  ٣/٤  أو  5/2  (بخط واحد، بدون كسر عمودي معقد).
   - القوى اكتبيها بالكلمة إن لزم:  س² → "س تربيع"، س³ → "س تكعيب".
5. الشكل النهائي:
   - أعطي النتيجة النهائية في سطر مستقل في آخر الإجابة، مثل:
     "إذن الناتج النهائي هو: س = ٤."
   - تجنبي التكرار أو الشرح الزائد عن الحد.
6. الدقّة:
   - تحققي من صحة العمليات الحسابية.
   - إذا كان السؤال ناقصًا أو غير واضح، اطلبي توضيحًا بدل اختراع بيانات.
`;

// ===== تنظيف الإجابة من الرموز الغريبة =====
function cleanAnswer(text = "") {
  let t = String(text);

  // إزالة أي كود داخل ``` ```
  t = t.replace(/```[\s\S]*?```/g, "");

  // إزالة بقايا أوامر LaTeX/Markdown الشائعة
  t = t
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 / $2")
    .replace(/\\cdot/g, " × ")
    .replace(/\\times/g, " × ")
    .replace(/\\sqrt/g, " جذر ")
    .replace(/\\left|\\right/g, "")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/rightarrow|div/g, "")
    .replace(/\*\*/g, "")      // نجوم التحديد
    .replace(/`/g, "")         // باك تِك
    .replace(/_/g, " ");

  // ترتيب بسيط لبعض أنماط الضرب
  t = t.replace(/x\s*([0-9س])/g, "× $1");

  // تقليل المسافات والأسطر الفارغة
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ===== دالة الطلب من نموذج الذكاء =====
async function askDurra(question) {
  if (!OPENAI_KEY) {
    throw new Error("مفتاح OPENAI_API_KEY غير موجود في إعدادات الخادم.");
  }

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question }
    ],
    temperature: 0.3,
    max_tokens: 900
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("OpenAI error:", res.status, errText);
    throw new Error("OPENAI_REQUEST_FAILED");
  }

  const data = await res.json();
  const raw =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
      ? data.choices[0].message.content
      : "عذراً، لم أستطع توليد إجابة مناسبة.";

  return cleanAnswer(raw);
}

// ===== إعدادات Express =====
app.use(cors());
app.use(express.json());

// فحص الصحة
app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", service: "durra-server" });
});

// المسار الأساسي الذي يستخدمه الفرونت
app.post("/api/chat", async (req, res) => {
  try {
    const message =
      (req.body && req.body.message ? String(req.body.message) : "").trim();

    if (!message) {
      return res.status(400).json({
        error: "يرجى إرسال سؤال رياضي في الحقل 'message'."
      });
    }

    const answer = await askDurra(message);
    res.json({ answer, reply: answer });
  } catch (err) {
    console.error("API_CHAT_ERROR:", err);
    res.status(500).json({
      error:
        "عذراً، حصل خلل مؤقت في الخادم أثناء توليد الإجابة. حاولي مرة أخرى بعد قليل."
    });
  }
});

// مسار /ask القديم للتوافق
app.post("/ask", async (req, res) => {
  try {
    const question =
      (req.body && req.body.question ? String(req.body.question) : "").trim();

    if (!question) {
      return res.status(400).json({
        error: "يرجى إرسال سؤال رياضي في الحقل 'question'."
      });
    }

    const answer = await askDurra(question);
    res.json({ answer, reply: answer });
  } catch (err) {
    console.error("ASK_ERROR:", err);
    res.status(500).json({
      error:
        "عذراً، حصل خلل مؤقت في الخادم أثناء توليد الإجابة. حاولي مرة أخرى بعد قليل."
    });
  }
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Durra server listening on port ${PORT}`);
});
