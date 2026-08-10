import { z } from "zod";

export const OnboardingSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short").max(120),
  businessType: z.string().trim().min(2).max(80),
  timezone: z.string().trim().min(1, "Timezone is required"),
  primaryGoal: z.string().trim().min(2).max(200),
  websiteDomain: z
    .string()
    .trim()
    .max(253)
    .refine((v) => v === "" || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v), {
      message: "Enter a valid domain (e.g. example.com)",
    })
    .optional(),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

/** website_com style slug from a business name, plus a short random suffix for uniqueness. */
export function slugify(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "workspace"}-${suffix}`;
}
