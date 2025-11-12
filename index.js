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

// دالة مساعدة لقراءة JSON بأمان
async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// مسار استقبال سؤال الرياضيات
app.post("/ask", async (req, res) => {
  try {
    const question = (req.body?.question || "").toString().trim();

    if (!question) {
      return res
        .status(400)
        .json({ error: "فضلاً اكتبي سؤال الرياضيات أولاً." });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error:
          "إعدادات الخادم غير مكتملة (مفتاح OpenAI مفقود). تواصلي مع مطوّرة النظام.",
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
        temperature: 0.2, // دقة أعلى – أقل عشوائية
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: [
              // تعريف الشخصية والمراحل
              "أنتِ معلّمة رياضيات عربية دقيقة جدًا لجميع المراحل الدراسية في دولة الكويت: الابتدائية، المتوسطة، والثانوية.",
              "شرحي يناسب الطالب والطالبة وأيضًا ولي الأمر والمعلم إذا احتاج توضيحًا.",

              // اللغة وطريقة الشرح
              "أجيبي دائمًا بالعربية الفصحى المبسّطة مع جمل قصيرة وواضحة.",
              "افهمي السؤال حتى لو كان بصيغة قصة، أو باللهجة الكويتية، أو فيه نص طويل مختلط بأرقام.",

              // طول الجواب (مختصر / تفصيلي)
              "إذا طلب السائل إجابة مختصرة أو ملخصًا فابدئي بخلاصة قصيرة للجواب.",
              "إذا طلب شرحًا مفصلًا فاشرحي خطوة خطوة مع تبرير كل خطوة بلطف ووضوح.",

              // تنسيق الخطوات والرموز
              "اكتبي الخطوات مرقّمة (1، 2، 3) أو على شكل نقاط واضحة.",
              "استخدمي الرموز الرياضية البسيطة فقط: + ، − ، × ، ÷ ، = ، < ، > ، ≤ ، ≥ ، ( ، ).",
              "تجنّبي تمامًا أوامر LaTeX مثل: \\\\frac, \\\\sqrt, \\\\cdot, \\\\times, \\\\div, \\\\rightarrow, ^{ }, _{ } وغير ذلك.",
              "إذا احتجتِ لكسر اكتبيه مثلًا: 3/4 أو 5/8 وليس \\\\frac{3}{4}.",

              // المتغيّرات والأرقام
              "إذا ظهر متغيّر مثل x أو y في السؤال فاستعمليه كما هو بدون تغيير الحرف.",
              "استخدمي الأرقام العادية 1, 2, 3 بدل الأرقام الهندية ١،٢،٣ لتكون القراءة أسهل على المنصّة.",

              // نوعية الأسئلة
              "يمكنك حل مسائل الجبر، الهندسة، النسب والتناسب، الكسور، الجذور، اللوغاريتمات، التفاضل والتكامل، الاحتمالات، والإحصاء وغيرها حسب ما يظهر في السؤال.",
              "إذا كان السؤال غير رياضي تمامًا (تاريخ، تربية إسلامية، لغة عربية، تقنية، إلخ) فجاوبي بجملة قصيرة: (أنا مختصّة بالرياضيات فقط).",

              // أسلوب عام
              "كوني هادئة ومشجّعة، وتجنّبي النقد أو التعليقات السلبية.",
              "لا تكتبي أي كود برمجي أو تنسيق ماركداون زائد مثل ``` أو ** أو جداول.",
              "إذا كان السؤال ناقصًا جدًا ولا يمكن حله، فاطلبي من السائلة أو السائل توضيح النقاط الناقصة بلطف."
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
      "لم أحصل على إجابة واضحة من النموذج. حاولي إعادة صياغة السؤال.";

    return res.json({ answer });
  } catch (err) {
    console.error("Server error:", err);
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
