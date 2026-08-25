export type CompanyMatchCandidate = { id: string; name: string };

function normalize(value: string) {
  return value.toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(the|limited|ltd|inc|incorporated|corporation|corp|plc)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function acronym(value: string) {
  return value.split(/\s+/)
    .filter((word) => !["the", "and", "of", "group", "limited", "ltd"].includes(word.toLowerCase()))
    .map((word) => word[0])
    .join("")
    .toLowerCase();
}

/** Find a uniquely-mentioned database company in a transcript without an LLM. */
export function findMentionedCompany(transcript: string, companies: CompanyMatchCandidate[]) {
  const normalizedTranscript = normalize(transcript);
  const names = companies.filter((company) => {
    const normalizedName = normalize(company.name);
    return normalizedName.length >= 3 && normalizedTranscript.includes(normalizedName);
  });
  if (names.length === 1) return names[0];
  // Exit narratives usually introduce the employer before a prospective next
  // company (for example, "Google ... I want to join Nvidia"). This remains a
  // deterministic name match and never accepts an ID from the model.
  if (names.length > 1) {
    return names.sort((left, right) => transcript.toLowerCase().indexOf(left.name.toLowerCase()) - transcript.toLowerCase().indexOf(right.name.toLowerCase()))[0];
  }

  const acronymMatches = companies.filter((company) => {
    const initialism = acronym(company.name);
    return initialism.length >= 2 && new RegExp(`\\b${initialism}\\b`, "i").test(transcript);
  });
  return acronymMatches.length === 1 ? acronymMatches[0] : null;
}

/** Match a model-provided name without ever accepting a model-provided database ID. */
export function matchCompanyName(value: string | null, companies: CompanyMatchCandidate[]) {
  if (!value) return null;
  const target = normalize(value);
  if (target.length < 2) return null;

  const exact = companies.filter((company) => normalize(company.name) === target);
  if (exact.length === 1) return exact[0];

  const acronymMatches = companies.filter((company) => acronym(company.name) === target);
  if (acronymMatches.length === 1) return acronymMatches[0];

  if (target.length < 4) return null;
  const partialMatches = companies.filter((company) => {
    const candidate = normalize(company.name);
    return candidate.includes(target) || target.includes(candidate);
  });
  return partialMatches.length === 1 ? partialMatches[0] : null;
}
