import type { AuthError } from "@supabase/supabase-js";

export const CAPTCHA_FAILED_MESSAGE = "The security check failed. Refresh the page and try again.";

export function captchaOptions(form: FormData) {
  const token = form.get("captchaToken");
  return typeof token === "string" && token ? { captchaToken: token } : {};
}

export const isCaptchaError = (error: AuthError) => error.code === "captcha_failed";
