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

  jobTitle: z.string().min(2).max(100),
  roleFamily: z.string().min(2).max(80),
  location: z.string().min(2).max(100),

  tenureMonths: z.number().int().min(1).max(600),

  departureType: z.enum([
    "RESIGNED",
    "LAID_OFF",
    "TERMINATED",
    "CONTRACT_ENDED",
    "OTHER"
  ]),

  primaryReason: z.enum(EXIT_REASON_VALUES),

  otherReasons: z
    .array(z.enum(EXIT_REASON_VALUES))
    .max(2),

  managementScore: z.number().int().min(1).max(5),
  compensationScore: z.number().int().min(1).max(5),
  workLifeScore: z.number().int().min(1).max(5),
  careerGrowthScore: z.number().int().min(1).max(5),
  learningScore: z.number().int().min(1).max(5),
  cultureScore: z.number().int().min(1).max(5),
  jobSecurityScore: z.number().int().min(1).max(5),

  positiveExperience: z.string().min(20).max(4000),
  reasonForLeaving: z.string().min(30).max(5000),
  wishIKnew: z.string().min(20).max(3000),

  recommendCompany: z.enum(["YES", "MAYBE", "NO"]),
  workHereAgain: z.enum(["YES", "MAYBE", "NO"])
});
