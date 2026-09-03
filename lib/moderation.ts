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

  if (/\b(?:my manager|my boss|manager)\s+[A-Z][a-z]+/.test(text)) {
    flags.add("POSSIBLE_NAMED_PRIVATE_PERSON");
  }

  if (/\b(?:on|dated?)\s+(?:\d{1,2}[/-]){2}\d{2,4}\b/i.test(text)) {
    flags.add("EXACT_IDENTIFYING_DATE");
  }

  if (/\bteam of (?:[1-9]|ten)\b/i.test(text)) {
    flags.add("SMALL_TEAM_ANONYMITY_RISK");
  }

  if (/\b(?:project|client|customer|account)\s+[A-Z][A-Za-z0-9-]{2,}/.test(text)) {
    flags.add("POSSIBLE_CONFIDENTIAL_PROJECT_OR_CUSTOMER");
  }

  if (/\b(?:my manager|my boss|director|lead)\s+(?:is|was|called|named)\b/i.test(text)) {
    flags.add("POSSIBLE_PERSONAL_ATTACK_OR_NAMED_ACCUSATION");
  }

  if (/\b(?:buy now|crypto|telegram|whatsapp me|guaranteed income)\b/i.test(text)) {
    flags.add("POSSIBLE_SPAM");
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
