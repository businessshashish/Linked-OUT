export type CompanySearchCandidate = { id: string; name: string; slug: string };

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/\b(the|limited|ltd|inc|incorporated|corporation|corp|plc)\b/g, "").replace(/[^a-z0-9]/g, "");
}

const aliases: Record<string, string> = {
  tcs: "tataconsultancyservices",
  ibm: "internationalbusinessmachines",
  hdfc: "hdfcbank",
  aws: "amazon",
  amazonwebservices: "amazon",
  amazonwebservice: "amazon",
  amazonaws: "amazon",
  google: "google",
  meta: "meta",
  facebook: "meta"
};

function distance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => index);
  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    let previous = rows[0];
    rows[0] = rightIndex;
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const value = Math.min(rows[leftIndex] + 1, rows[leftIndex - 1] + 1, previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
      previous = rows[leftIndex];
      rows[leftIndex] = value;
    }
  }
  return rows[left.length];
}

export function resolveCompany<T extends CompanySearchCandidate>(value: string | undefined, companies: T[]): T | null {
  if (!value) return null;
  const raw = normalize(value);
  const target = aliases[raw] || raw;
  const exact = companies.filter((company) => normalize(company.name) === target || normalize(company.slug) === target);
  if (exact.length === 1) return exact[0];
  const partial = companies.filter((company) => {
    const name = normalize(company.name);
    return target.length >= 4 && (name.includes(target) || target.includes(name));
  });
  if (partial.length === 1) return partial[0];
  const typo = companies.filter((company) => target.length >= 4 && Math.abs(normalize(company.name).length - target.length) <= 1 && distance(normalize(company.name), target) <= 1);
  return typo.length === 1 ? typo[0] : null;
}

export function searchCompanies<T extends CompanySearchCandidate>(companies: T[], query: string): T[] {
  const target = normalize(query);
  if (!target) return [];
  const resolved = resolveCompany(query, companies);
  const partial = companies.filter((company) => normalize(company.name).includes(target) || normalize(company.slug).includes(target));
  return [...new Map([...(resolved ? [[resolved.id, resolved] as const] : []), ...partial.map((company) => [company.id, company] as const)]).values()];
}
