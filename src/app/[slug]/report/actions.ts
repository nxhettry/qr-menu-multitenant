"use server";
import type { FormState } from "@/lib/auth/schemas";
import { CAPTCHA_FAILED_MESSAGE } from "@/lib/auth/captcha";
import { verifyTurnstile } from "@/lib/auth/turnstile-verify";
import { abuseReportInput } from "@/lib/abuse/schemas";
import { reportMenu } from "@/lib/abuse/repository";
import { isRestaurantSlug } from "@/lib/menu/slugs";
import { checkRateLimitByIp, getClientIp, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";

export async function reportMenuAction(slug: string, _state: FormState, form: FormData): Promise<FormState> {
  if (form.get("website")) return { message: "Thank you. We’ll review your report." };
  const input = abuseReportInput.safeParse({ reason: form.get("reason"), details: form.get("details") ?? "", contact: form.get("contact") ?? "" });
  if (!input.success) return { error: input.error.issues[0].message };
  if (!isRestaurantSlug(slug)) return { error: "This menu could not be found." };
  if (!(await checkRateLimitByIp("abuseReport")).allowed) return { error: RATE_LIMITED_MESSAGE };
  if (!await verifyTurnstile(String(form.get("captchaToken") ?? ""), await getClientIp())) return { error: CAPTCHA_FAILED_MESSAGE };
  try {
    if (!await reportMenu(slug, input.data)) return { error: "This menu isn’t available to report." };
  } catch { return { error: "We couldn’t send your report. Please try again shortly." }; }
  return { message: "Thank you. We’ll review your report." };
}
