import Link from "next/link";

import prisma from "@/lib/prisma";
import { companyAnalytics } from "@/lib/analytics";
import { isDemoDataEnabled } from "@/lib/demo-data";
import { getCurrentUser } from "@/lib/session";
import StoryCard from "@/components/StoryCard";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const { q = "" } = await searchParams;

  const query = q.trim();
  const demoDataEnabled = await isDemoDataEnabled();
  const user = await getCurrentUser();

  const feedStories = await prisma.exitStory.findMany({
    where: {
      ...(demoDataEnabled ? {} : { isDemo: false }),
      status: "APPROVED"
    },
    include: {
      company: {
        select: {
          name: true,
          slug: true
        }
      },
      responses: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" }
    ],
    take: 10
  });

  const companies = query
    ? await prisma.company.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              industry: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              location: {
                contains: query,
                mode: "insensitive"
              }
            }
          ]
        },

        include: {
          stories: {
            where: {
              ...(demoDataEnabled ? {} : { isDemo: false }),
              status: "APPROVED"
            }
          }
        },

        take: 12,
        orderBy: {
          name: "asc"
        }
      })
    : [];

  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          THE OTHER SIDE OF WORK
        </div>

        <h1>
          Why did you <span>leave?</span>
        </h1>

        <p className="heroText">
          Search companies through the experiences
          of people who actually worked there.
        </p>

        <form className="searchBox">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search a company"
            autoComplete="off"
          />

          <button>Search</button>
        </form>

        <div className="heroLinks">
          <Link href="/explore">
            Explore workplaces
          </Link>

          <span>·</span>

          <Link href="/submit">
            Share your experience
          </Link>
        </div>
      </section>

      {query && (
        <section className="container">
          <div className="sectionHeader">
            <div>
              <div className="eyebrow">
                SEARCH
              </div>

              <h2>
                Results for “{query}”
              </h2>
            </div>
          </div>

          {!companies.length && (
            <div className="emptyState">
              No companies found.
            </div>
          )}

          <div className="companyGrid">
            {companies.map((company) => {
              const analytics =
                companyAnalytics(company.stories);

              return (
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
                        {analytics.overall ??
                          "—"}
                        /100
                      </strong>

                      <span>
                        {analytics.topReason
                          ?.label ||
                          "Building data"}
                      </span>

                      <span>
                        {
                          analytics.sampleSize
                        }{" "}
                        stories
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!query && (
        <section className="container introGrid">
          <div className="featureCard">
            <div className="eyebrow">
              EXIT INTELLIGENCE
            </div>

            <h2>
              See why people actually leave.
            </h2>

            <p>
              Management. Workload. Money.
              Culture. Growth. Layoffs. See the
              patterns instead of digging through
              hundreds of reviews.
            </p>
          </div>

          <div className="featureCard">
            <div className="eyebrow">
              BEFORE YOU JOIN
            </div>

            <h2>
              Know what employees wish they knew.
            </h2>

            <p>
              Learn what may never appear in a
              careers page or interview deck.
            </p>
          </div>

          <div className="featureCard">
            <div className="eyebrow">
              ANONYMOUS BY DESIGN
            </div>

            <h2>
              Experience before identity.
            </h2>

            <p>
              Public identities are deliberately
              separated from account identities.
            </p>
          </div>
        </section>
      )}

      <section className="container feedSection">
        <div className="feedHeader">
          <div>
            <div className="eyebrow">WORKPLACE FEED</div>
            <h2>What people are saying after they leave</h2>
            <p className="muted">Firsthand experiences, shared anonymously.</p>
          </div>
          <Link href="/submit" className="primaryButton">Share your experience</Link>
        </div>

        <div className="feedColumns">
          <div className="feedList">
            {feedStories.map((story) => (
              <div className="feedPost" key={story.id}>
                <Link className="feedCompany" href={`/company/${story.company.slug}`}>
                  <span className="feedCompanyAvatar">{story.company.name[0]}</span>
                  <span>
                    <strong>{story.company.name}</strong>
                    <small>Employee experience</small>
                  </span>
                </Link>
                <StoryCard
                  story={{
                    ...story,
                    verified: false,
                    canReport: Boolean(user)
                  }}
                />
              </div>
            ))}
            {!feedStories.length && (
              <div className="emptyState">No employee experiences have been shared yet.</div>
            )}
          </div>

          <aside className="adRail" aria-label="Sponsored content">
            <div className="adRailLabel">Sponsored</div>
            <article className="adCard">
              <div className="adCardTopline">
                <span className="adBrandMark">N</span>
                <span><strong>Northstar</strong><small>For teams building better work</small></span>
              </div>
              <h3>Make work worth staying for.</h3>
              <p>See how high-performing teams build clarity, trust, and growth into the everyday.</p>
              <button className="adButton" type="button">Learn more</button>
            </article>
            <article className="adCard adCardCompact">
              <div className="adCardTopline">
                <span className="adBrandMark adBrandMarkBlue">V</span>
                <span><strong>Vertex People</strong><small>Workplace intelligence</small></span>
              </div>
              <p>Turn employee feedback into action your people can feel.</p>
              <button className="adButton" type="button">Explore insights</button>
            </article>
          </aside>
        </div>
      </section>
    </>
  );
}
