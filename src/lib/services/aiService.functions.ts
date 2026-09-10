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
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { available: false, reason: "AI classification unavailable" };

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You classify a photo of electronic waste into exactly one category. " +
                `Allowed categories: ${AI_CATEGORIES.join(", ")}. ` +
                "Report your own confidence as a number between 0 and 1. Never estimate price or value.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Which category of e-waste is in this photo?" },
                { type: "image_url", image_url: { url: data.imageDataUrl } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_category",
                description: "Report the e-waste category and the model confidence.",
                parameters: {
                  type: "object",
                  properties: {
                    category: { type: "string", enum: [...AI_CATEGORIES] },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["category", "confidence"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_category" } },
        }),
      });
    } catch {
      return { available: false, reason: "AI classification unavailable — no connection" };
    }

    if (res.status === 429) return { available: false, reason: "AI classification unavailable — rate limit reached" };
    if (res.status === 402) return { available: false, reason: "AI classification unavailable — AI credits exhausted" };
    if (!res.ok) return { available: false, reason: "AI classification unavailable" };

    try {
      const body = (await res.json()) as {
        choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
      };
      const raw = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
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
