// MCHAWE NEXUS AI — Cloudflare Worker عبر OpenRouter
// أضف OPENROUTER_API_KEY كـ Secret في Cloudflare فقط، ولا تضعه في GitHub أو صفحة الموقع.
const ALLOWED_ORIGIN = "https://kkoh2009h-gif.github.io";
const MODELS = [
  "openrouter/free",
  "qwen/qwen3-4b:free",
  "google/gemma-3-4b-it:free"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response("Forbidden", { status: 403 });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return Response.json({ error: "استخدم POST فقط." }, { status: 405, headers: cors });
    }
    if (!env.OPENROUTER_API_KEY) {
      return Response.json({ error: "مفتاح OPENROUTER_API_KEY غير مضاف كـ Secret في Cloudflare." }, { status: 500, headers: cors });
    }

    let message;
    try {
      const body = await request.json();
      message = String(body.message || "").trim().slice(0, 4000);
    } catch {
      return Response.json({ error: "صيغة الطلب غير صحيحة؛ أرسل JSON يحتوي على message." }, { status: 400, headers: cors });
    }
    if (!message) {
      return Response.json({ error: "اكتب رسالة أولاً." }, { status: 400, headers: cors });
    }

    const systemPrompt = "أنت NEXUS AI، مساعد تقني ودود للمستخدم العراقي. أجب باللغة العربية فقط، وفضّل اللهجة العراقية الطبيعية والواضحة. لا تستخدم الصينية أو لغات أخرى إلا إذا طلب المستخدم ذلك صراحة. إذا كان السؤال عن تطوير لعبة أو موقع، أعطِ خطوات عملية واقعية ومناسبة لمن يستخدم هاتف أندرويد فقط ولا يملك كمبيوتر. لا تدّعِ أنك نفذت شيئاً أو أنك تملك اتصالاً بميزات الجهاز أو الإنترنت ما لم يكن ذلك متاحاً فعلاً.";

    let lastError = "النماذج المجانية لم تُرجع إجابة.";
    for (const model of MODELS) {
      try {
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.OPENROUTER_API_KEY,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://kkoh2009h-gif.github.io/MCHAWE-NEXUS/",
            "X-Title": "MCHAWE NEXUS AI"
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            max_tokens: 700,
            temperature: 0.5
          })
        });

        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
          lastError = data.error?.message || ("فشل النموذج " + model + " (HTTP " + upstream.status + ").");
          continue;
        }

        const raw = data.choices?.[0]?.message?.content;
        const reply = typeof raw === "string" ? raw.trim() : "";
        if (reply) {
          return Response.json(
            { reply, model },
            { headers: { ...cors, "Cache-Control": "no-store" } }
          );
        }
        lastError = "النموذج " + model + " لم يُرجع نصاً.";
      } catch {
        lastError = "تعذر الاتصال بالنموذج " + model + ".";
      }
    }

    return Response.json(
      { error: "جرّبت أكثر من نموذج مجاني وما حصلت رد. جرّب بعد قليل. التفاصيل: " + lastError },
      { status: 502, headers: { ...cors, "Cache-Control": "no-store" } }
    );
  }
};
