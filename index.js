// Durra Server — معلمة رياضيات عربية نظيفة ومركّزة

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// middlewares
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: "*", credentials: false }));

// health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", service: "durra-server" });
});

// دالة تساعدنا نقرأ body من OpenAI لو فيه خطأ
async function readJsonSafe(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

// مسار السؤال الرئيسي: /ask
app.post("/ask", async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();

    if (!question) {
      return res
        .status(400)
        .json({ error: "رجاءً اكتبي سؤالًا رياضيًا أولًا." });
    }

    if (!OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "مفقود OPENAI_API_KEY على السيرفر. تواصلي مع المطوّرة." });
    }

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2, // دقة أعلى – أقل عشوائية
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              [
                "أنت معلمة رياضيات عربية دقيقة جدًا لطلاب المرحلة المتوسطة والثانوية.",
                "أجيبي دائمًا بالعربية الفصحى المبسطة.",
                "اكتبي الخطوات مرقّمة أو على شكل نقاط واضحة.",
                "استخدمي الرموز الرياضية البسيطة فقط: + ، − ، × ، ÷ ، = ، < ، > ، ≤ ، ≥ ، ( ، ).",
                "تجنبي تمامًا كتابة أوامر LaTeX مثل: \\frac, \\sqrt, \\cdot, \\times, \\div, \\rightarrow, ^{ }, _{ } وغير ذلك.",
                "إذا احتجتِ لكسر اكتبيه هكذا: 3/4 وليس \\frac{3}{4}.",
                "إذا ظهر متغيّر x في السؤال فاستعمليه كما هو، ولا تغيّريه إلى س أو غيره.",
                "استخدمي أرقامًا عادية (1, 2, 3) وليس الأرقام الهندية (١،٢،٣) لتسهيل القراءة على المنصّة.",
                "إذا كان السؤال غير رياضي (تاريخ، تربية إسلامية، إلخ) فجاوبي بجملة قصيرة: (أنا مختصّة بالرياضيات فقط).",
              ].join(" "),
          },
          { role: "user", content: question },
        ],
      }),
    });

    const data = await readJsonSafe(apiRes);

    if (!apiRes.ok) {
      // نفهم نوع الخطأ (مثلاً limit أو غيره) ونرجع رسالة ألطف
      const code = data?.error?.code || apiRes.status;
      let msg =
        data?.error?.message ||
        "تعذّر الحصول على إجابة من النموذج. حاولي مرة أخرى بعد قليل.";

      if (code === "rate_limit_exceeded" || apiRes.status === 429) {
        msg =
          "الخادم قال: تم الوصول للحد المسموح من استخدام النموذج مؤقتًا. انتظري دقيقة ثم حاولي مرة أخرى.";
      }

      return res.status(502).json({ error: msg });
    }

    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "لم أستطع توليد إجابة مناسبة.";

    return res.json({ answer });
  } catch (err) {
    console.error("ASK_ERROR:", err);
    return res.status(500).json({
      error: "عذرًا، حصل خطأ غير متوقّع في الخادم أثناء توليد الإجابة.",
    });
  }
});

// مسار GET اختياري للتجربة اليدوية من المتصفح
app.get("/ask", (_req, res) => {
  res.json({ msg: "أرسلي طلب POST إلى /ask مع { question: '...' }" });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Durra server running on port ${PORT}`);
});
