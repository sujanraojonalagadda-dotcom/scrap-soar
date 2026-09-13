import { supabase } from "@/integrations/supabase/client";

export async function transcribeVoice(audio: Blob, language: "en" | "hi"): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session ended. Please sign in again.");
  const form = new FormData();
  form.append("file", audio, "recording.wav");
  form.append("language", language);
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "Voice transcription failed.");
    throw new Error(message || "Voice transcription failed.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Voice transcription returned no result.");
  const decoder = new TextDecoder();
  let buffer = "";
  let transcript = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const event = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: string; text?: string };
        if (event.type === "transcript.text.delta" && event.delta) transcript += event.delta;
        if (event.type === "transcript.text.done" && event.text) transcript = event.text;
      } catch {
        // Ignore non-JSON SSE keepalive events.
      }
    }
  }
  if (!transcript.trim()) throw new Error("No speech was detected. Please try again.");
  return transcript.trim();
}