import { createServerFn } from "@tanstack/react-start";

export const AI_CATEGORIES = [
  "Laptop",
  "Mobile",
  "Monitor",
  "Television",
  "Printer",
  "Keyboard",
  "Mouse",
  "Cable",
  "Battery",
  "Other",
] as const;

export type AiCategory = (typeof AI_CATEGORIES)[number];

export type ClassifyResult =
  | { available: true; category: AiCategory; confidence: number }
  | { available: false; reason: string };

/**
 * Image -> e-waste category only.
 * This never returns a price. Pricing is calculated separately from the
 * recycler's own rate. When the model gives no usable category/confidence we
 * report that classification is unavailable instead of inventing a value.
 */
export const classifyEwaste = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string }) => {
    if (typeof input?.imageDataUrl !== "string" || !input.imageDataUrl.startsWith("data:image/")) {
      throw new Error("A photo is required.");
    }
    return input;
  })
  .handler(async ({ data }): Promise<ClassifyResult> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return { available: false, reason: "AI classification unavailable" };

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(data.imageDataUrl);
    if (!match) return { available: false, reason: "AI classification unavailable" };
    const [, mimeType, base64] = match;

    let res: Response;
    try {
      res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "You classify a photo of electronic waste into exactly one category. " +
                    `Allowed categories: ${AI_CATEGORIES.join(", ")}. ` +
                    "Report your own confidence as a number between 0 and 1. Never estimate price or value.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  { text: "Which category of e-waste is in this photo?" },
                  { inlineData: { mimeType, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  category: { type: "STRING", enum: [...AI_CATEGORIES] },
                  confidence: { type: "NUMBER" },
                },
                required: ["category", "confidence"],
              },
            },
          }),
        },
      );
    } catch {
      return { available: false, reason: "AI classification unavailable — no connection" };
    }

    if (res.status === 429) return { available: false, reason: "AI classification unavailable — rate limit reached" };
    if (res.status === 401 || res.status === 403) {
      return { available: false, reason: "AI classification unavailable — the AI key was rejected" };
    }
    if (!res.ok) return { available: false, reason: "AI classification unavailable" };

    try {
      const body = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
      if (!raw) return { available: false, reason: "AI classification unavailable" };
      const parsed = JSON.parse(raw) as { category?: string; confidence?: number };
      const category = AI_CATEGORIES.find((c) => c.toLowerCase() === String(parsed.category).toLowerCase());
      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;
      if (!category || confidence === null || Number.isNaN(confidence)) {
        return { available: false, reason: "AI classification unavailable" };
      }
      return { available: true, category, confidence: Math.max(0, Math.min(1, confidence)) };
    } catch {
      return { available: false, reason: "AI classification unavailable" };
    }
  });
