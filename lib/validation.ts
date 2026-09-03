import { z } from "zod";

import { EXIT_REASON_VALUES } from "@/lib/constants";

export const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[A-Z]/, "Password needs an uppercase letter")
    .regex(/[a-z]/, "Password needs a lowercase letter")
    .regex(/[0-9]/, "Password needs a number")
});

export const storySchema = z.object({
  companyId: z.string().min(1),

  roleFamily: z.string().min(2).max(80),
  location: z.string().trim().max(100).nullable(),

  primaryReason: z.enum(EXIT_REASON_VALUES),

  otherReasons: z
    .array(z.enum(EXIT_REASON_VALUES))
    .max(2),

  positiveExperience: z.string().trim().min(10).max(4000),
  reasonForLeaving: z.string().trim().max(5000),
  wishIKnew: z.string().trim().min(10).max(3000),

  recommendCompany: z.enum(["YES", "MAYBE", "NO"]),
  workHereAgain: z.enum(["YES", "MAYBE", "NO"])
});
