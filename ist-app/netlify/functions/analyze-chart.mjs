export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { base64, mediaType } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/png", data: base64 }
            },
            {
              type: "text",
              text: `This is a horizontal bar chart showing sales data. Each person may have two bars. Extract ONLY the TOP (larger/lighter blue) bar value labeled as Annualized Booking Net Hardware for each person. Return ONLY valid JSON like: {"Robby Redmond": 354584, "Daniel Boyd": 246279} — exact numbers from the chart labels, no markdown, no explanation.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const match = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);

    if (!match) {
      return new Response(JSON.stringify({ error: "Could not parse chart data" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ extracted: JSON.parse(match[0]) }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = { path: "/api/analyze-chart" };
