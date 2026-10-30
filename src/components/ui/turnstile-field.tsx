import type { TurnstileController } from "@/hooks/use-turnstile";
import { FormError } from "./form";

export function TurnstileField({ captcha }: { captcha: TurnstileController }) {
  if (!captcha.enabled) return null;
  return <>
    <div ref={captcha.containerRef} />
    <input type="hidden" name="captchaToken" value={captcha.token ?? ""} />
    <FormError message={captcha.failed ? "The security check couldn’t load. Refresh the page or disable content blockers." : undefined} />
  </>;
}
