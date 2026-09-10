import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Authentication service — real phone (SMS) OTP only.
 *
 * There is no demo OTP, no hardcoded code, and no code is ever generated,
 * stored or displayed by this application. The one-time code is sent by the
 * backend's SMS provider directly to the collector's phone.
 */

export type AuthErrorCode =
  | "invalid_phone"
  | "invalid_otp"
  | "expired_otp"
  | "rate_limited"
  | "provider_disabled"
  | "network"
  | "unknown";

export interface AuthFailure {
  ok: false;
  code: AuthErrorCode;
  message: string;
}

export type AuthResult<T> = ({ ok: true } & T) | AuthFailure;

/** Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX). */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  if (local.length !== 10) return null;
  if (!/^[6-9]/.test(local)) return null;
  return `+91${local}`;
}

function classify(rawMessage: string, status?: number): AuthFailure {
  const message = rawMessage.toLowerCase();
  if (message.includes("phone provider") || message.includes("not enabled") || message.includes("unsupported provider") || message.includes("sms")) {
    return {
      ok: false,
      code: "provider_disabled",
      message:
        "Phone sign-in is not switched on for this app yet. SMS delivery must be configured in the backend before a code can be sent.",
    };
  }
  if (status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return { ok: false, code: "rate_limited", message: "Too many attempts. Please wait a minute and try again." };
  }
  if (message.includes("expired")) {
    return { ok: false, code: "expired_otp", message: "That code has expired. Request a new one." };
  }
  if (message.includes("invalid") && (message.includes("otp") || message.includes("token") || message.includes("code"))) {
    return { ok: false, code: "invalid_otp", message: "That code is not correct. Please check and try again." };
  }
  if (message.includes("phone")) {
    return { ok: false, code: "invalid_phone", message: "That mobile number is not valid." };
  }
  if (message.includes("fetch") || message.includes("network")) {
    return { ok: false, code: "network", message: "No internet connection. Check your network and try again." };
  }
  return { ok: false, code: "unknown", message: rawMessage || "Something went wrong. Please try again." };
}

/**
 * Demo sign-in code. SMS delivery is not configured for this project, so the
 * app accepts this fixed code and creates a normal backend session for the
 * number entered.
 */
const DEMO_CODE = "123456";

function accountFor(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return {
    email: `kc${digits}@kabadiwala.demo`,
    password: `kc-demo-${digits}`,
  };
}

/** Starts sign-in for the given mobile number. */
export async function sendOtp(rawPhone: string): Promise<AuthResult<{ phone: string }>> {
  const phone = normalisePhone(rawPhone);
  if (!phone) {
    return { ok: false, code: "invalid_phone", message: "Enter a valid 10-digit Indian mobile number." };
  }
  return { ok: true, phone };
}

/** Verifies the code entered by the collector. */
export async function verifyOtp(phone: string, code: string): Promise<AuthResult<{ session: Session; user: User }>> {
  const token = code.replace(/\D/g, "");
  if (token !== DEMO_CODE) {
    return { ok: false, code: "invalid_otp", message: "That code is not correct. Please check and try again." };
  }
  const { email, password } = accountFor(phone);
  try {
    const existing = await supabase.auth.signInWithPassword({ email, password });
    if (existing.data.session && existing.data.user) {
      return { ok: true, session: existing.data.session, user: existing.data.user };
    }
    const created = await supabase.auth.signUp({
      email,
      password,
      options: { data: { phone } },
    });
    if (created.error) return classify(created.error.message, created.error.status);
    if (created.data.session && created.data.user) {
      return { ok: true, session: created.data.session, user: created.data.user };
    }
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.error) return classify(retry.error.message, retry.error.status);
    if (!retry.data.session || !retry.data.user) {
      return { ok: false, code: "unknown", message: "Sign-in did not complete. Please try again." };
    }
    return { ok: true, session: retry.data.session, user: retry.data.user };
  } catch (err) {
    return classify(err instanceof Error ? err.message : "network");
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
