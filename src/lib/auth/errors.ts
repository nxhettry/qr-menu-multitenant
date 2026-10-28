import "server-only";
import type { AuthError } from "@supabase/supabase-js";

const messages: Partial<Record<string, string>> = {
  over_email_send_rate_limit: "Too many emails were sent recently. Please wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
  weak_password: "Choose a stronger password with a mix of letters, numbers, and symbols.",
  email_address_invalid: "This email address can’t be used. Please try a different one.",
  email_address_not_authorized: "This email address can’t receive emails yet. Please try a different one.",
  signup_disabled: "New sign-ups are currently disabled.",
};

export function authErrorMessage(action: string, error: AuthError, fallback: string) {
  console.error(`[auth:${action}]`, error.status, error.code, error.message);
  return (error.code && messages[error.code]) ?? fallback;
}
