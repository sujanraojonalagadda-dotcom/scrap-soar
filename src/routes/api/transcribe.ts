import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const apiKey = process.env["LOVABLE_API_KEY"];
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
        const upstream = new FormData();
        upstream.append("model", "google/gemini-3.5-transcribe");
        upstream.append("file", audio, "recording.wav");
        upstream.append("stream", "true");
        const language = input.get("language");
        if (language === "en" || language === "hi") upstream.append("language", language);
        const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });
        if (!response.ok) {
          const message = await response.text().catch(() => "Voice transcription failed.");
          return new Response(message || "Voice transcription failed.", { status: response.status });
        }
        return new Response(response.body, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});