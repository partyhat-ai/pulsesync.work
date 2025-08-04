import { z } from 'zod';

export const LicenseResponse = z.object({
  email: z.string().email().optional(),   // optional for now, warn if missing
  licenseToken: z.string(),
  plan: z.string().optional(),
  status: z.string().optional(),
  expiresAt: z.string().optional()
});

export type LicenseResponseType = z.infer<typeof LicenseResponse>;