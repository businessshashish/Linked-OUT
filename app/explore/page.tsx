import Link from "next/link";

import prisma from "@/lib/prisma";
import { companyAnalytics } from "@/lib/analytics";
import { isDemoDataEnabled } from "@/lib/demo-data";

export default async function ExplorePage() {
  const demoDataEnabled = await isDemoDataEnabled();
  const companies = await prisma.company.findMany({
    include: {
      stories: {
        where: {
          ...(demoDataEnabled ? {} : { isDemo: false }),
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

  return (
    <div className="container">
      <div className="eyebrow">EXPLORE</div>

      <h1>Workplace reality, at scale.</h1>

      <p className="lead">
        Discover companies through departure
        patterns rather than corporate branding.
      </p>

      <div className="companyGrid">
        {ranked.map(({ company, analytics }) => (
          <Link
            href={`/company/${company.slug}`}
            className="companyCard"
            key={company.id}
          >
            {company.logoUrl ? (
              <img className="companyLogo" src={company.logoUrl} alt="" />
            ) : (
              <div className="companyInitial">{company.name[0]}</div>
            )}

            <div>
              <h3>{company.name}</h3>

              <p className="muted">
                {company.industry} ·{" "}
                {company.location}
              </p>

              {company.description && (
                <p className="companyDescription">{company.description}</p>
              )}

              <div className="companyStats">
                <strong>
                  {analytics.overall ?? "—"}
                  /100
                </strong>

                <span>
                  {analytics.topReason?.label ||
                    "More data needed"}
                </span>

                <span>
                  {analytics.sampleSize} stories
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
