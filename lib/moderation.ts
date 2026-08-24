export function moderationFlags(text: string) {
  const flags = new Set<string>();

  const emailRegex =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  const phoneRegex =
    /(?:\+?\d[\d\s\-()]{7,}\d)/;

  const urlRegex =
    /https?:\/\/|www\./i;

  const highRiskClaims = [
    "fraud",
    "criminal",
    "stole",
    "stolen",
    "theft",
    "illegal",
    "assault",
    "bribe",
    "corruption",
    "sexual harassment",
    "harassed me"
  ];

  if (emailRegex.test(text)) {
    flags.add("POSSIBLE_EMAIL_OR_PII");
  }

  if (phoneRegex.test(text)) {
    flags.add("POSSIBLE_PHONE_OR_PII");
  }

  if (urlRegex.test(text)) {
    flags.add("EXTERNAL_LINK");
  }

  const lower = text.toLowerCase();

  if (highRiskClaims.some((word) => lower.includes(word))) {
    flags.add("HIGH_RISK_ALLEGATION");
  }

  if (text.length > 5000) {
    flags.add("UNUSUALLY_LONG_SUBMISSION");
  }

  return [...flags];
}

export function combinedStoryFlags(parts: string[]) {
  return moderationFlags(parts.join("\n"));
}
