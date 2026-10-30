import type { TurnstileController } from "@/hooks/use-turnstile";
import { FormError } from "./form";

export function TurnstileField({ captcha: { enabled, containerRef, token, failed } }: { captcha: TurnstileController }) {
  if (!enabled) return null;
  return <>
    <div ref={containerRef} />
    <input type="hidden" name="captchaToken" value={token ?? ""} />
    <FormError message={failed ? "The security check couldn’t load. Refresh the page or disable content blockers." : undefined} />
  </>;
}
