import { z } from "zod";

import { EXIT_REASON_VALUES } from "@/lib/constants";

export const EXIT_INTERVIEW_FIELD_NAMES = [
  "companyName", "jobTitle", "roleFamily", "location", "tenureMonths",
  "departureType", "primaryReason", "otherReasons", "managementScore",
  "compensationScore", "workLifeScore", "careerGrowthScore", "learningScore",
  "cultureScore", "jobSecurityScore", "positiveExperience", "reasonForLeaving",
  "wishIKnew", "recommendCompany", "workHereAgain"
] as const;

export const EXIT_INTERVIEW_INFERRED_FIELD_NAMES = [
  "managementScore", "compensationScore", "workLifeScore", "careerGrowthScore",
  "learningScore", "cultureScore", "jobSecurityScore"
] as const;

const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable();
const nullableScore = z.number().int().min(1).max(5).nullable();
const nullableChoice = z.enum(["YES", "MAYBE", "NO"]).nullable();

// This is intentionally strict: an LLM is not allowed to add fields, IDs, or
// arbitrary metadata to the browser-side extraction result.
export const exitInterviewExtractionSchema = z.object({
  companyName: nullableText(160),
  jobTitle: nullableText(100),
  roleFamily: nullableText(80),
  location: nullableText(100),
  tenureMonths: z.number().int().min(1).max(600).nullable(),
  departureType: z.enum(["RESIGNED", "LAID_OFF", "TERMINATED", "CONTRACT_ENDED", "OTHER"]).nullable(),
  primaryReason: z.enum(EXIT_REASON_VALUES).nullable(),
  otherReasons: z.array(z.enum(EXIT_REASON_VALUES)).max(2),
  managementScore: nullableScore,
  compensationScore: nullableScore,
  workLifeScore: nullableScore,
  careerGrowthScore: nullableScore,
  learningScore: nullableScore,
  cultureScore: nullableScore,
  jobSecurityScore: nullableScore,
  positiveExperience: nullableText(4000),
  reasonForLeaving: nullableText(5000),
  wishIKnew: nullableText(3000),
  recommendCompany: nullableChoice,
  workHereAgain: nullableChoice,
  inferredFields: z.array(z.enum(EXIT_INTERVIEW_INFERRED_FIELD_NAMES)).max(EXIT_INTERVIEW_INFERRED_FIELD_NAMES.length)
}).strict().superRefine((value, context) => {
  if (value.primaryReason && value.otherReasons.includes(value.primaryReason)) {
    context.addIssue({ code: "custom", path: ["otherReasons"], message: "Primary reason cannot also be an other reason." });
  }
  for (const field of value.inferredFields) {
    if (value[field] === null || (Array.isArray(value[field]) && value[field].length === 0)) {
      context.addIssue({ code: "custom", path: ["inferredFields"], message: "An inferred field must have a value." });
    }
  }
});

export type ExitInterviewExtraction = z.infer<typeof exitInterviewExtractionSchema>;

/**
 * An LLM may try to return a database ID. It is deliberately discarded; all
 * other unexpected keys remain a schema error so the response is not trusted.
 */
export function validateExitInterviewExtraction(output: unknown) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return exitInterviewExtractionSchema.safeParse(output);
  }
  const { companyId: _ignoredCompanyId, ...fields } = output as Record<string, unknown>;
  return exitInterviewExtractionSchema.safeParse(fields);
}
