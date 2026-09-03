import Link from "next/link";

import prisma from "@/lib/prisma";
import { companyAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/session";
import { searchCompanies } from "@/lib/company-search";
import { requestCompanyAction } from "@/app/actions";
import StoryCard from "@/components/StoryCard";
import FeedLeftRail from "@/components/FeedLeftRail";
import FunnelTracker from "@/components/FunnelTracker";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    requested?: string;
    error?: string;
  }>;
}) {
  const pageParams = await searchParams;
  const { q = "" } = pageParams;

  const query = q.trim();
  const user = await getCurrentUser();

  const feedStories = await prisma.exitStory.findMany({
    where: {
      isDemo: false,
      status: "APPROVED"
    },
    include: {
      company: {
        select: {
          name: true,
          slug: true,
          logoUrl: true
        }
      },
      publicIdentity: { select: { userId: true } },
      responses: {
        where: { status: "APPROVED", claim: { is: { status: "APPROVED" } } },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" }
    ],
    take: 10
  });

  const identityId = user?.publicIdentity?.id;
  const feedUserIds = feedStories.map((story) => story.publicIdentity?.userId).filter((id): id is string => Boolean(id));
  const verifiedFeedUsers = feedUserIds.length ? await prisma.employmentVerification.findMany({
    where: { userId: { in: feedUserIds }, status: "APPROVED" },
    select: { userId: true, companyId: true }
  }) : [];
  const verifiedFeedKeys = new Set(verifiedFeedUsers.map((verification) => `${verification.userId}:${verification.companyId}`));
  const [publishedStories, pendingStories] = identityId
    ? await Promise.all([
        prisma.exitStory.count({ where: { publicIdentityId: identityId, status: "APPROVED" } }),
        prisma.exitStory.count({ where: { publicIdentityId: identityId, status: "PENDING" } })
      ])
    : [0, 0];

  const companies = query
    ? await prisma.company.findMany({
        include: {
          stories: {
            where: {
              isDemo: false,
              status: "APPROVED"
            }
          }
        },

        orderBy: {
          name: "asc"
        }
      })
    : [];
  const searchResults = query ? searchCompanies(companies, query).slice(0, 12) : [];

  return (
    <>
      <FunnelTracker event="landing_view" />
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

          {pageParams.error && <div className="errorBanner">{pageParams.error}</div>}
          {pageParams.requested && <div className="successBanner">Thanks—{pageParams.requested} has been sent for admin review.</div>}

          {!searchResults.length && <div className="emptyState"><h3>Can’t find your company?</h3><p>Request it for admin review. We never add arbitrary public companies automatically.</p><form action={requestCompanyAction} className="requestCompanyForm"><input name="name" defaultValue={query} required maxLength={160} /><input name="website" placeholder="Company website (optional)" type="url" /><button className="primaryButton">Request company</button></form></div>}

          <div className="companyGrid">
            {searchResults.map((company) => {
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
                      <span>
                        {analytics.sampleSize < 5
                          ? "Individual experiences only"
                          : analytics.percentagesAllowed
                            ? "Patterns available"
                            : "Early patterns"}
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
          <FeedLeftRail
            user={user}
            publishedStories={publishedStories}
            pendingStories={pendingStories}
          />

          <div className="feedList">
            {feedStories.map((story) => (
              <div className="feedPost" key={story.id}>
                <Link className="feedCompany" href={`/company/${story.company.slug}`}>
                  {story.company.logoUrl ? (
                    <img
                      className="feedCompanyAvatar feedCompanyLogo"
                      src={story.company.logoUrl}
                      alt={`${story.company.name} logo`}
                    />
                  ) : (
                    <span className="feedCompanyAvatar">{story.company.name[0]}</span>
                  )}
                  <span>
                    <strong>{story.company.name}</strong>
                    <small>Employee experience</small>
                  </span>
                </Link>
                <StoryCard
                  story={{
                    id: story.id,
                    authorAlias: story.authorAlias,
                    roleFamily: story.roleFamily,
                    location: story.location,
                    primaryReason: story.primaryReason,
                    otherReasons: story.otherReasons,
                    positiveExperience: story.positiveExperience,
                    reasonForLeaving: story.reasonForLeaving,
                    wishIKnew: story.wishIKnew,
                    recommendCompany: story.recommendCompany,
                    workHereAgain: story.workHereAgain,
                    createdAt: story.createdAt,
                    responses: story.responses.map((response) => ({ id: response.id, body: response.body, authorLabel: response.authorLabel, createdAt: response.createdAt, claimId: response.claimId })),
                    verified: Boolean(story.publicIdentity && verifiedFeedKeys.has(`${story.publicIdentity.userId}:${story.companyId}`)),
                    canReport: Boolean(user)
                  }}
                />
              </div>
            ))}
            {!feedStories.length && (
              <div className="emptyState">No employee experiences have been shared yet.</div>
            )}
          </div>

          <aside className="adRail contributionRail" aria-label="Contribute an experience">
            <div className="eyebrow">YOUR EXPERIENCE MATTERS</div>
            <h3>Help make workplace information more useful.</h3>
            <p>Share a firsthand experience anonymously. Every submission is reviewed before it is published.</p>
            <Link href="/submit" className="secondaryButton inlineButton">Share your experience</Link>
          </aside>
        </div>
      </section>
    </>
  );
}
