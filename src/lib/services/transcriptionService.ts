import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/types";

export async function transcribeVoice(audio: Blob, language: Lang): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");

  const form = new FormData();
  form.append("audio", audio, "speech.wav");
  form.append("language", language);

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) throw new Error("Transcription is unavailable right now.");

  const text = await response.text();
  let transcript = "";
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const payload = JSON.parse(line.slice(5).trim());
      if (typeof payload?.transcript === "string") transcript = payload.transcript;
    } catch {
      // ignore keep-alive lines
    }
  }
  if (!transcript) throw new Error("Nothing was transcribed.");
  return transcript;
}
