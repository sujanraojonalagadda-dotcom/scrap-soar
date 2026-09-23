import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const apiKey = process.env["GEMINI_API_KEY"];
        if (!authorization || !supabaseUrl || !publishableKey) return new Response("Unauthorized", { status: 401 });
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: authorization, apikey: publishableKey },
        });
        if (!authResponse.ok) return new Response("Unauthorized", { status: 401 });
        if (!apiKey) return new Response("Voice transcription is not configured.", { status: 401 });
        const input = await request.formData();
        const audio = input.get("file");
        if (!(audio instanceof File) || audio.size < 2048) return new Response("That recording was empty. Please try again.", { status: 400 });
        if (audio.size > 14 * 1024 * 1024 || audio.type !== "audio/wav") return new Response("Please record a shorter voice message.", { status: 400 });

        const language = input.get("language");
        const spoken =
          language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : language === "en" ? "English" : null;
        const bytes = new Uint8Array(await audio.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        const base64 = btoa(binary);

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
          {
            method: "POST",
            headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text:
                      "Transcribe the speech in the audio exactly as spoken" +
                      (spoken ? ` (the speaker uses ${spoken})` : "") +
                      ". Reply with the transcript text only, with no extra commentary.",
                  },
                ],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ inlineData: { mimeType: "audio/wav", data: base64 } }],
                },
              ],
            }),
          },
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          const message =
            response.status === 401 || response.status === 403
              ? "Voice transcription is unavailable — the AI key was rejected."
              : response.status === 429
                ? "Voice transcription is busy right now. Please try again shortly."
                : "Voice transcription failed.";
          console.error("[transcribe] gemini error", response.status, detail.slice(0, 500));
          return new Response(message, { status: response.status });
        }

        const body = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = (body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "").trim();

        const stream = `data: ${JSON.stringify({ type: "transcript.text.done", text })}\n\n`;
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
