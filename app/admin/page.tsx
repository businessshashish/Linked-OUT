import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

import {
  moderateClaimAction,
  moderateResponseAction,
  moderateStoryAction,
  moderateVerificationAction,
  resolveReportAction
} from "@/app/actions";

export default async function AdminPage() {
  await requireAdmin();

  const [
    stories,
    verifications,
    claims,
    responses,
    reports
  ] = await Promise.all([
    prisma.exitStory.findMany({
      where: {
        status: "PENDING"
      },

      include: {
        company: true
      },

      orderBy: {
        createdAt: "asc"
      }
    }),

    prisma.employmentVerification.findMany({
      where: {
        status: "PENDING"
      },

      include: {
        company: true,
        user: true
      },

      orderBy: {
        createdAt: "asc"
      }
    }),

    prisma.employerClaim.findMany({
      where: {
        status: "PENDING"
      },

      include: {
        company: true,
        user: true
      },

      orderBy: {
        createdAt: "asc"
      }
    }),

    prisma.companyResponse.findMany({
      where: {
        status: "PENDING"
      },

      include: {
        company: true
      },

      orderBy: {
        createdAt: "asc"
      }
    }),

    prisma.contentReport.findMany({
      where: {
        status: "OPEN"
      },

      include: {
        story: {
          include: {
            company: true
          }
        }
      },

      orderBy: {
        createdAt: "asc"
      }
    })
  ]);

  return (
    <div className="container">
      <div className="eyebrow">
        MODERATION OS
      </div>

      <h1>Admin dashboard</h1>

      <div className="adminStats">
        <div>
          <strong>{stories.length}</strong>
          <span>Stories pending</span>
        </div>

        <div>
          <strong>
            {verifications.length}
          </strong>
          <span>Verification requests</span>
        </div>

        <div>
          <strong>{claims.length}</strong>
          <span>Employer claims</span>
        </div>

        <div>
          <strong>{reports.length}</strong>
          <span>Open reports</span>
        </div>
      </div>

      <section className="adminSection">
        <h2>Stories awaiting moderation</h2>

        {!stories.length && (
          <p className="muted">
            Queue clear.
          </p>
        )}

        {stories.map((story) => (
          <article
            className="adminCard"
            key={story.id}
          >
            <h3>
              {story.company.name} ·{" "}
              {story.jobTitle}
            </h3>

            {!!story.autoFlags.length && (
              <div className="flagBox">
                Automatic flags:{" "}
                {story.autoFlags.join(", ")}
              </div>
            )}

            <p>
              <strong>Good:</strong>{" "}
              {story.positiveExperience}
            </p>

            <p>
              <strong>Why left:</strong>{" "}
              {story.reasonForLeaving}
            </p>

            <p>
              <strong>Wish they knew:</strong>{" "}
              {story.wishIKnew}
            </p>

            <form
              action={moderateStoryAction}
              className="moderationForm"
            >
              <input
                type="hidden"
                name="id"
                value={story.id}
              />

              <input
                name="note"
                placeholder="Moderator note"
              />

              <button
                name="decision"
                value="APPROVE"
                className="approveButton"
              >
                Approve
              </button>

              <button
                name="decision"
                value="REJECT"
                className="dangerButton"
              >
                Reject
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className="adminSection">
        <h2>Employment verification</h2>

        {verifications.map(
          (verification) => (
            <article
              className="adminCard"
              key={verification.id}
            >
              <h3>
                {verification.company.name}
              </h3>

              <p>
                Account:{" "}
                {verification.user.email}
              </p>

              <p>
                Method:{" "}
                {verification.method}
              </p>

              <p>
                Work email:{" "}
                {verification.workEmail ||
                  "—"}
              </p>

              <p>
                Evidence:{" "}
                {verification.evidenceNote ||
                  "—"}
              </p>

              <form
                action={
                  moderateVerificationAction
                }
                className="moderationForm"
              >
                <input
                  type="hidden"
                  name="id"
                  value={verification.id}
                />

                <input
                  name="note"
                  placeholder="Moderator note"
                />

                <button
                  name="decision"
                  value="APPROVE"
                  className="approveButton"
                >
                  Verify
                </button>

                <button
                  name="decision"
                  value="REJECT"
                  className="dangerButton"
                >
                  Reject
                </button>
              </form>
            </article>
          )
        )}
      </section>

      <section className="adminSection">
        <h2>Employer claims</h2>

        {claims.map((claim) => (
          <article
            className="adminCard"
            key={claim.id}
          >
            <h3>{claim.company.name}</h3>

            <p>
              User: {claim.user.email}
            </p>

            <p>
              Corporate email:{" "}
              {claim.workEmail}
            </p>

            <form
              action={moderateClaimAction}
              className="moderationForm"
            >
              <input
                type="hidden"
                name="id"
                value={claim.id}
              />

              <input
                name="note"
                placeholder="Moderator note"
              />

              <button
                name="decision"
                value="APPROVE"
                className="approveButton"
              >
                Approve claim
              </button>

              <button
                name="decision"
                value="REJECT"
                className="dangerButton"
              >
                Reject
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className="adminSection">
        <h2>Company responses</h2>

        {responses.map((response) => (
          <article
            className="adminCard"
            key={response.id}
          >
            <h3>{response.company.name}</h3>

            {!!response.autoFlags.length && (
              <div className="flagBox">
                Flags:{" "}
                {response.autoFlags.join(", ")}
              </div>
            )}

            <p>{response.body}</p>

            <form
              action={moderateResponseAction}
              className="moderationForm"
            >
              <input
                type="hidden"
                name="id"
                value={response.id}
              />

              <input
                name="note"
                placeholder="Moderator note"
              />

              <button
                name="decision"
                value="APPROVE"
                className="approveButton"
              >
                Publish
              </button>

              <button
                name="decision"
                value="REJECT"
                className="dangerButton"
              >
                Reject
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className="adminSection">
        <h2>Content reports</h2>

        {reports.map((report) => (
          <article
            className="adminCard"
            key={report.id}
          >
            <h3>
              {report.story.company.name}
            </h3>

            <p>
              <strong>
                Report reason:
              </strong>{" "}
              {report.reason}
            </p>

            <p>{report.details}</p>

            <p>
              <strong>
                Reported story:
              </strong>{" "}
              {report.story.reasonForLeaving}
            </p>

            <form
              action={resolveReportAction}
              className="moderationForm"
            >
              <input
                type="hidden"
                name="id"
                value={report.id}
              />

              <input
                name="note"
                placeholder="Resolution note"
              />

              <button
                name="decision"
                value="RESOLVE"
                className="approveButton"
              >
                Resolve
              </button>

              <button
                name="decision"
                value="DISMISS"
                className="secondaryButton"
              >
                Dismiss
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
