import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
import { companyAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/session";

import ReasonBars from "@/components/ReasonBars";
import StoryCard from "@/components/StoryCard";
import FunnelTracker from "@/components/FunnelTracker";

export async function generateMetadata({
  params
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const company = await prisma.company.findUnique({
    where: {
      slug
    }
  });

  if (!company) {
    return {};
  }

  return {
    title: `${company.name} employee experience`,

    description: `Why former employees left ${company.name}, employee sentiment, workplace trends and what employees wish they knew before joining.`
  };
}

export default async function CompanyPage({
  params,
  searchParams
}: {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    submitted?: string;
    reported?: string;
    error?: string;
  }>;
}) {
  const { slug } = await params;

  const query = await searchParams;

  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({
    where: {
      slug
    }
  });

  if (!company) {
    notFound();
  }

  const stories = await prisma.exitStory.findMany({
    where: {
      companyId: company.id,
      isDemo: false,
      status: "APPROVED"
    },

    include: {
      publicIdentity: {
        select: {
          alias: true,
          userId: true
        }
      },

      responses: {
        where: {
          status: "APPROVED",
          claim: { is: { status: "APPROVED" } }
        },

        orderBy: {
          createdAt: "desc"
        }
      }
    },

    orderBy: {
      publishedAt: "desc"
    }
  });

  const privateUserIds = stories
    .map((story) => story.publicIdentity?.userId)
    .filter((value): value is string => Boolean(value));

  const verifiedEmployment =
    privateUserIds.length
      ? await prisma.employmentVerification.findMany({
          where: {
            companyId: company.id,
            userId: {
              in: privateUserIds
            },
            status: "APPROVED"
          },

          select: {
            userId: true
          }
        })
      : [];

  const verifiedUserIds = new Set(
    verifiedEmployment.map(
      (verification) => verification.userId
    )
  );

  const companyResponses =
    await prisma.companyResponse.findMany({
      where: {
        companyId: company.id,
        storyId: null,
        isDemo: false,
        status: "APPROVED",
        claim: { is: { status: "APPROVED" } }
      },

      orderBy: {
        createdAt: "desc"
      },

      take: 3
    });

  const analytics = companyAnalytics(stories);

  const verifiedCount = stories.filter(
    (story) =>
      story.publicIdentity &&
      verifiedUserIds.has(
        story.publicIdentity.userId
      )
  ).length;

  return (
    <div className="container companyPage">
      <FunnelTracker event="company_view" source={company.slug} />
      {query.submitted && (
        <div className="successBanner">
          <strong>Your experience is in review.</strong> It is pending moderation for personal information, harassment, confidentiality concerns, and platform rules. You can see its status in your account.
        </div>
      )}

      {query.reported && (
        <div className="successBanner">
          Report received.
        </div>
      )}

      {query.error && (
        <div className="errorBanner">
          {query.error}
        </div>
      )}

      <section className="companyHero">
        {company.logoUrl ? (
          <img className="companyLogo large" src={company.logoUrl} alt="" />
        ) : (
          <div className="companyInitial large">{company.name[0]}</div>
        )}

        <div className="companyHeroContent">
          <div className="eyebrow">
            EMPLOYEE-GENERATED PROFILE
          </div>

          <h1>{company.name}</h1>

          <p className="muted">
            {[company.industry, company.location, company.employeeCount].filter(Boolean).join(" · ")}
          </p>

          <p>{company.description || analytics.summary}</p>

          <div className="companyHeroStats">
            <div>
              <strong>
                {analytics.sampleSize}
              </strong>

              <span>
                Published experiences
              </span>
            </div>

            <div>
              <strong>
                {verifiedCount}
              </strong>

              <span>
                Employment verified
              </span>
            </div>
          </div>

          <Link
            href={`/submit?company=${company.slug}`}
            className="primaryButton inlineButton"
          >
            Share your experience
          </Link>
        </div>
      </section>

      <div className="companyLayout">
        <aside className="companyRail companyRailLeft">
          <div className="panel railCard">
            <div className="railAvatar">{company.name[0]}</div>
            <strong>{company.name}</strong>
            <p className="muted">Employee-generated profile</p>
            <Link href={`/submit?company=${company.slug}`} className="secondaryButton inlineButton">Share experience</Link>
          </div>
          <div className="panel railCard">
            <div className="eyebrow">PROFILE SNAPSHOT</div>
            <div className="railStat"><strong>{analytics.sampleSize}</strong><span>published stories</span></div>
            <div className="railStat"><strong>{verifiedCount}</strong><span>verified experiences</span></div>
          </div>
        </aside>

        <div className="companyMain">
          {analytics.aggregateAllowed && <section className="panel">
            <div className="eyebrow">{analytics.percentagesAllowed ? "WHY PEOPLE LEFT" : "EARLY PATTERNS"}</div>
            <h2>{analytics.percentagesAllowed ? "Departure patterns" : "Early patterns from former employees"}</h2>
            <p className="muted">
              {analytics.percentagesAllowed
                ? `Percentages are based on ${analytics.sampleSize} published experiences. Employees can cite up to three reasons.`
                : `Mention counts from ${analytics.sampleSize} published experiences. LinkedOut does not show percentages until there are at least 20 contributors.`}
            </p>
            <ReasonBars reasons={analytics.reasonBreakdown} showPercentages={analytics.percentagesAllowed} />
          </section>}

          {analytics.sampleSize < 5 && <section className="panel emptyCompanyData"><h2>{analytics.sampleSize === 0 ? "No employee experiences yet. Be the first." : "Not enough data yet."}</h2><p className="muted">LinkedOut only shows aggregated workplace analytics after enough approved experiences are available.</p><Link href={`/submit?company=${company.slug}`} className="primaryButton inlineButton">Share your experience</Link></section>}

          {analytics.aggregateAllowed && <section className="panel beforeJoin">
        <div className="eyebrow">
          BEFORE YOU JOIN
        </div>

        <h2>
          What former employees wish they knew
        </h2>

        {!stories.length ? (
          <p>No experiences yet.</p>
        ) : (
          <div className="quoteGrid">
            {stories
              .slice(0, 8)
              .map((story) => (
                <blockquote key={story.id}>
                  “{story.wishIKnew}”
                </blockquote>
              ))}
          </div>
        )}
          </section>}

      {!!companyResponses.length && (
          <section className="panel">
          <div className="eyebrow">
            COMPANY RESPONSE
          </div>

          <h2>
            What the company says
          </h2>

          {companyResponses.map(
            (response) => (
              <div
                className="companyResponse"
                key={response.id}
              >
                <p>{response.body}</p>

                <small>Verified company response · {response.authorLabel}</small>
              </div>
            )
          )}
          </section>
      )}

          <section>
        <div className="sectionHeader">
          <div>
            <div className="eyebrow">
              EMPLOYEE STORIES
            </div>

            <h2>
              Experiences behind the numbers
            </h2>
          </div>
        </div>

        <div className="storyList">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
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
                verified: Boolean(
                  story.publicIdentity &&
                    verifiedUserIds.has(
                      story.publicIdentity
                        .userId
                    )
                ),

                canReport: Boolean(user)
              }}
            />
          ))}

          {!stories.length && (
            <div className="emptyState">
              Nobody has shared an approved
              experience here yet.
            </div>
          )}
        </div>
          </section>
        </div>

        <aside className="companyRail companyRailRight">
          <div className="panel railCard">
            <div className="eyebrow">WHY PEOPLE LEAVE</div>
            <p className="muted">The strongest themes from published employee experiences.</p>
            {analytics.aggregateAllowed ? <ReasonBars reasons={analytics.reasonBreakdown.slice(0, 4)} showPercentages={analytics.percentagesAllowed} /> : <p className="muted">Patterns appear once at least five former employees have contributed.</p>}
          </div>
          <div className="panel railCard joinCard">
            <strong>Know before you join</strong>
            <p className="muted">Read firsthand accounts and make a more informed career decision.</p>
            <Link href={`/submit?company=${company.slug}`} className="primaryButton inlineButton">Add your experience</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
