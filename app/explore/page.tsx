import Link from "next/link";

import prisma from "@/lib/prisma";
import { companyAnalytics } from "@/lib/analytics";

export default async function ExplorePage() {
  const companies = await prisma.company.findMany({
    include: {
      stories: {
        where: {
          isDemo: false,
          status: "APPROVED"
        }
      }
    }
  });

  const ranked = companies
    .map((company) => ({
      company,
      analytics: companyAnalytics(
        company.stories
      )
    }))
    .sort(
      (a, b) =>
        b.analytics.sampleSize -
        a.analytics.sampleSize
    );
  const withExperiences = ranked.filter(({ analytics }) => analytics.sampleSize > 0);
  const lookingForFirst = ranked.filter(({ analytics }) => analytics.sampleSize === 0).slice(0, 12);

  function companyCard(company: (typeof ranked)[number]["company"], analytics: (typeof ranked)[number]["analytics"]) {
    return <Link href={`/company/${company.slug}`} className="companyCard" key={company.id}>{company.logoUrl ? <img className="companyLogo" src={company.logoUrl} alt="" /> : <div className="companyInitial">{company.name[0]}</div>}<div><h3>{company.name}</h3><p className="muted">{company.industry} · {company.location}</p>{company.description && <p className="companyDescription">{company.description}</p>}<div className="companyStats"><span>{analytics.sampleSize ? `${analytics.sampleSize} employee experience${analytics.sampleSize === 1 ? "" : "s"}` : "Looking for a first experience"}</span><span>{analytics.sampleSize >= 20 ? "Patterns available" : analytics.sampleSize >= 5 ? "Early patterns" : analytics.sampleSize ? "Individual experiences only" : ""}</span></div></div></Link>;
  }

  return (
    <div className="container">
      <div className="eyebrow">EXPLORE</div>

      <h1>Workplace reality, at scale.</h1>

      <p className="lead">
        Discover companies through departure
        patterns rather than corporate branding.
      </p>

      <section className="exploreSection"><div className="sectionHeader"><div><div className="eyebrow">EMPLOYEE EXPERIENCES</div><h2>Companies with published experiences</h2></div></div>{withExperiences.length ? <div className="companyGrid">{withExperiences.map(({ company, analytics }) => companyCard(company, analytics))}</div> : <div className="emptyState">No approved employee experiences yet. Explore a company and be the first to share.</div>}</section>

      <section className="exploreSection"><div className="sectionHeader"><div><div className="eyebrow">GROW THE RECORD</div><h2>Companies looking for their first experience</h2><p className="muted">Company profiles are ready; workplace analytics appear only after enough approved stories.</p></div></div><div className="companyGrid">{lookingForFirst.map(({ company, analytics }) => companyCard(company, analytics))}</div></section>
    </div>
  );
}
