export const RATE_LIMIT_POLICIES = {
  slugCheck: { limit: 40, windowSeconds: 60 },
  menuMutation: { limit: 120, windowSeconds: 60 },
  menuImport: { limit: 10, windowSeconds: 600 },
  imageUpload: { limit: 20, windowSeconds: 600 },
  adminAction: { limit: 60, windowSeconds: 60 },
  signIn: { limit: 10, windowSeconds: 300 },
  signUp: { limit: 5, windowSeconds: 3600 },
  passwordReset: { limit: 5, windowSeconds: 3600 },
  accountExport: { limit: 5, windowSeconds: 3600 },
  accountDeletion: { limit: 5, windowSeconds: 3600 },
  abuseReport: { limit: 5, windowSeconds: 3600 },
} as const;

export type RateLimitPolicy = keyof typeof RATE_LIMIT_POLICIES;
