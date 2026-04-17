// Shared AI helpers to avoid circular dependencies
let groqInstance = null;
let geminiInstance = null;

function setProviders(groq, gemini) {
  groqInstance = groq;
  geminiInstance = gemini;
}

async function aiCall(messages, maxTokens = 500) {
  if (groqInstance) {
    try {
      const completion = await groqInstance.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      return completion.choices[0].message.content.trim();
    } catch (err) {
      const isRateOrAuth = err?.status === 429 || err?.status === 401;
      if (!isRateOrAuth) throw err;
    }
  }
  if (geminiInstance) {
    const model = geminiInstance.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(messages.map(m => m.content).join("\n\n"));
    return result.response.text().trim();
  }
  throw new Error("No AI provider available");
}

function parseJSON(raw) {
  return JSON.parse(raw.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, ""));
}

module.exports = { setProviders, aiCall, parseJSON };
