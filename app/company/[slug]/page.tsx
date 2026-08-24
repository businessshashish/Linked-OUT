import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
import { companyAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/session";
import { isDemoDataEnabled } from "@/lib/demo-data";

import ReasonBars from "@/components/ReasonBars";
import ScoreBars from "@/components/ScoreBars";
import StoryCard from "@/components/StoryCard";

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
  const demoDataEnabled = await isDemoDataEnabled();

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
      ...(demoDataEnabled ? {} : { isDemo: false }),
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
          status: "APPROVED"
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
        ...(demoDataEnabled ? {} : { isDemo: false }),
        status: "APPROVED"
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
      {query.submitted && (
        <div className="successBanner">
          Your story was submitted for
          moderation.
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
            {company.industry} ·{" "}
            {company.location} ·{" "}
            {company.employeeCount ||
              "Employee count unavailable"}
          </p>

          <p>{company.description || analytics.summary}</p>

          <div className="companyHeroStats">
            <div>
              <strong>
                {analytics.overall ?? "—"}
              </strong>

              <span>
                Employee sentiment / 100
              </span>
            </div>

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
          <section className="twoColumn">
            <div className="panel">
          <div className="eyebrow">
            WHY PEOPLE LEFT
          </div>

          <h2>Departure patterns</h2>

          <p className="muted">
            Percentage means the share of
            published stories that cited the
            reason. Employees can cite up to three
            reasons.
          </p>

          <ReasonBars
            reasons={analytics.reasonBreakdown}
          />
          </div>

          <div className="panel">
          <div className="eyebrow">
            EMPLOYEE SENTIMENT
          </div>

          <h2>Workplace dimensions</h2>

          <ScoreBars
            scores={analytics.dimensions}
          />
            </div>
          </section>

          <section className="panel">
        <div className="eyebrow">
          EXPERIENCE TIMELINE
        </div>

        <h2>How the workplace changed</h2>

        {!analytics.timeline.length ? (
          <p className="muted">
            No timeline data yet.
          </p>
        ) : (
          <div className="timeline">
            {analytics.timeline.map(
              (entry) => (
                <div
                  className="timelineEntry"
                  key={entry.year}
                >
                  <strong>{entry.year}</strong>

                  <span>
                    {entry.score === null
                      ? "Not enough data"
                      : `${entry.score}/100 sentiment`}
                  </span>

                  <span className="muted">
                    {entry.count} experiences
                  </span>

                  {entry.topReason && (
                    <span>
                      Main exit theme:{" "}
                      {
                        entry.topReason
                          .label
                      }
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        )}
          </section>

          <section className="panel beforeJoin">
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
          </section>

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

                <small>
                  {response.authorLabel}
                </small>
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
                ...story,

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
            <ReasonBars reasons={analytics.reasonBreakdown.slice(0, 4)} />
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
