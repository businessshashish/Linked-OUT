import type { ExitInterviewExtraction } from "@/lib/ai/exit-interview";
import { findMentionedCompany, type CompanyMatchCandidate } from "@/lib/ai/company-matching";

function capture(text: string, expression: RegExp, maxLength: number) {
  const value = expression.exec(text)?.[1]?.replace(/\s+/g, " ").trim();
  return value ? value.slice(0, maxLength) : null;
}

function roleFamily(jobTitle: string | null) {
  if (!jobTitle) return null;
  if (/\b(engineer|developer|programmer|sre|devops)\b/i.test(jobTitle)) return "Engineering";
  if (/\b(design(?:er)?|ux|ui)\b/i.test(jobTitle)) return "Design";
  if (/\b(product manager|product owner)\b/i.test(jobTitle)) return "Product";
  if (/\b(sales|account executive|business development)\b/i.test(jobTitle)) return "Sales";
  if (/\b(marketing|content|seo)\b/i.test(jobTitle)) return "Marketing";
  return null;
}

/** Extract only explicit, unambiguous facts for use beside—not instead of—the local LLM. */
export function extractExplicitTranscriptFacts(text: string, companies: CompanyMatchCandidate[]): ExitInterviewExtraction | null {
  const lower = text.toLowerCase();
  const jobTitle = capture(text, /\b(?:worked|work)\s+(?:at|for)\s+[^.!?]*?\s+as\s+(?:an?\s+)?([^.!?]+)/i, 100);
  const location = capture(text, /\b(?:was|worked|work|based|located|living)\s+in\s+([a-z][a-z .'-]*?)(?:[,!?.]|$)/i, 100);
  const tenure = capture(text, /\b(?:worked|there)\s+for\s+(?:like\s+|about\s+|around\s+)?(\d{1,3})\s+months?\b/i, 3);
  const tenureMonths = tenure ? Number(tenure) : null;
  const departureType = /\b(resigned|quit)\b/i.test(text) ? "RESIGNED"
    : /\b(laid off|layoff)\b/i.test(text) ? "LAID_OFF"
      : /\b(terminated|fired)\b/i.test(text) ? "TERMINATED"
        : /\b(contract ended|contract was over)\b/i.test(text) ? "CONTRACT_ENDED" : null;
  const mentionsCareerGrowth = /\b(career|grow|growth|learn|learning|switch(?:ing)? (?:my )?domain)\b/.test(lower);
  const mentionsBetterOpportunity = /\b(better opportunit(?:y|ies)|wanted to work|want to work|join|joining|offer)\b/.test(lower);
  const hasPositiveExperience = /\b(good|great|helped|supportive|culture|job security|pretty decent|not that bad|pretty fine)\b/.test(lower);
  const company = findMentionedCompany(text, companies);

  if (!company && !jobTitle && !location && !tenureMonths && !departureType && !mentionsCareerGrowth && !mentionsBetterOpportunity && !hasPositiveExperience) return null;

  const primaryReason = mentionsCareerGrowth ? "CAREER_GROWTH" : mentionsBetterOpportunity ? "BETTER_OPPORTUNITY" : null;
  return {
    companyName: company?.name ?? null,
    jobTitle,
    roleFamily: roleFamily(jobTitle),
    location,
    tenureMonths: tenureMonths && tenureMonths >= 1 && tenureMonths <= 600 ? tenureMonths : null,
    departureType,
    primaryReason,
    otherReasons: primaryReason === "CAREER_GROWTH" && mentionsBetterOpportunity ? ["BETTER_OPPORTUNITY"] : [],
    managementScore: null, compensationScore: null, workLifeScore: null, careerGrowthScore: null,
    learningScore: null, cultureScore: null, jobSecurityScore: null,
    positiveExperience: hasPositiveExperience ? text.slice(0, 4000) : null,
    reasonForLeaving: (mentionsCareerGrowth || mentionsBetterOpportunity) ? text.slice(0, 5000) : null,
    wishIKnew: null, recommendCompany: null, workHereAgain: null, inferredFields: []
  };
}

/** Prefer explicit transcript facts whenever they are available. */
export function mergeTranscriptFacts(llm: ExitInterviewExtraction, explicit: ExitInterviewExtraction | null): ExitInterviewExtraction {
  if (!explicit) return llm;
  return {
    ...llm,
    companyName: explicit.companyName ?? llm.companyName,
    jobTitle: explicit.jobTitle ?? llm.jobTitle,
    roleFamily: explicit.roleFamily ?? llm.roleFamily,
    location: explicit.location ?? llm.location,
    tenureMonths: explicit.tenureMonths ?? llm.tenureMonths,
    departureType: explicit.departureType ?? llm.departureType,
    primaryReason: explicit.primaryReason ?? llm.primaryReason,
    otherReasons: explicit.otherReasons.length ? explicit.otherReasons : llm.otherReasons,
    positiveExperience: explicit.positiveExperience ?? llm.positiveExperience,
    reasonForLeaving: explicit.reasonForLeaving ?? llm.reasonForLeaving,
  };
}
