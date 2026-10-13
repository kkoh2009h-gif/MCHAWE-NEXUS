// MCHAWE NEXUS AI — Cloudflare Worker using OpenRouter's free-model router
// Add OPENROUTER_API_KEY as a Cloudflare Worker Secret. Never put it in index.html or GitHub.
const ALLOWED_ORIGIN = "https://kkoh2009h-gif.github.io";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN;
    const cors = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return Response.json({ error: "استخدم POST فقط." }, { status: 405, headers: cors });
    if (!env.OPENROUTER_API_KEY) return Response.json({ error: "أضف OPENROUTER_API_KEY في Secrets داخل Cloudflare." }, { status: 500, headers: cors });

    try {
      const body = await request.json();
      const message = String(body.message || "").trim().slice(0, 4000);
      if (!message) return Response.json({ error: "اكتب رسالة أولاً." }, { status: 400, headers: cors });

      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.OPENROUTER_API_KEY,
          "Content-Type": "application/json",
          "HTTP-Referer": ALLOWED_ORIGIN,
          "X-Title": "MCHAWE NEXUS AI"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            { role: "system", content: "أنت NEXUS AI، مساعد عربي ودود يتحدث باللهجة العراقية عند الحاجة. أجب بوضوح واختصار، وساعد في التقنية وتطوير المواقع والألعاب. لا تدّعِ أنك متصل بميزات الجهاز أو الإنترنت ما لم تكن متاحة فعلاً." },
            { role: "user", content: message }
          ],
          max_tokens: 700,
          temperature: 0.7
        })
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        return Response.json({ error: data.error?.message || "خدمة OpenRouter رفضت الطلب. قد يكون النموذج المجاني مشغولاً أو تجاوزت الحد." }, { status: 502, headers: cors });
      }
      const reply = data.choices?.[0]?.message?.content;
      return Response.json({ reply: typeof reply === "string" && reply.trim() ? reply.trim() : "ما وصلني رد نصّي. جرّب مرة ثانية." }, { headers: { ...cors, "Cache-Control": "no-store" } });
    } catch (err) {
      return Response.json({ error: "تعذر معالجة الطلب. تأكد من إرسال JSON صحيح." }, { status: 400, headers: cors });
    }
  }
};
