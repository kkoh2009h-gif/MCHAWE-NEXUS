// MCHAWE NEXUS AI — Cloudflare Worker
// Set GEMINI_API_KEY as a Worker Secret. Never paste the key into this file or index.html.
const ALLOWED_ORIGIN = "https://kkoh2009h-gif.github.io";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return Response.json({ error: "استخدم POST فقط." }, { status: 405, headers: cors });
    if (!env.GEMINI_API_KEY) return Response.json({ error: "لم يتم إعداد GEMINI_API_KEY في أسرار Cloudflare." }, { status: 500, headers: cors });

    try {
      const body = await request.json();
      const message = String(body.message || "").trim().slice(0, 4000);
      if (!message) return Response.json({ error: "اكتب رسالة أولاً." }, { status: 400, headers: cors });

      const upstream = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: "أنت NEXUS AI، مساعد عربي ودود يتحدث باللهجة العراقية عند الحاجة. أجب بوضوح واختصار، وساعد في التقنية وتطوير المواقع والألعاب. لا تدّعِ أنك متصل بميزات الجهاز أو الإنترنت ما لم تكن متاحة فعلاً." }]
            },
            contents: [{ role: "user", parts: [{ text: message }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
          })
        }
      );

      const data = await upstream.json();
      if (!upstream.ok) {
        return Response.json({ error: data.error?.message || "خدمة الذكاء الاصطناعي رفضت الطلب." }, { status: 502, headers: cors });
      }
      const reply = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
      return Response.json({ reply: reply || "ما وصلني رد نصّي. جرّب مرة ثانية." }, { headers: { ...cors, "Cache-Control": "no-store" } });
    } catch (err) {
      return Response.json({ error: "تعذر معالجة الطلب. تأكد من إرسال JSON صحيح." }, { status: 400, headers: cors });
    }
  }
};
