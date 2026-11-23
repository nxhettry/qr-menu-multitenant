import { z } from "zod";

export const REPORT_REASONS = [
  ["INAPPROPRIATE", "Inappropriate or offensive content"],
  ["MISLEADING", "Misleading or wrong information"],
  ["COPYRIGHT", "Uses my photo or content without permission"],
  ["SPAM", "Spam or scam"],
  ["OTHER", "Something else"],
] as const;

export const abuseReportInput = z.object({
  reason: z.enum(REPORT_REASONS.map(([value]) => value) as [string, ...string[]], { error: "Choose a reason for your report." }),
  details: z.string().trim().max(1000, "Keep the details under 1000 characters."),
  contact: z.string().trim().max(200, "Keep the contact under 200 characters."),
});
