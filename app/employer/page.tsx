import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import {
  submitCompanyResponseAction,
  submitEmployerClaimAction
} from "@/app/actions";
import CompanyPicker from "@/components/CompanyPicker";

export default async function EmployerPage({
  searchParams
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const query = await searchParams;

  const companies = await prisma.company.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const claims = await prisma.employerClaim.findMany({
    where: {
      userId: user.id
    },

    include: {
      company: {
        include: {
          stories: {
            where: {
              status: "APPROVED"
            },

            orderBy: {
              publishedAt: "desc"
            },

            take: 20
          }
        }
      }
    },

    orderBy: {
      createdAt: "desc"
    }
  });

  const approvedClaims = claims.filter(
    (claim) => claim.status === "APPROVED"
  );

  return (
    <div className="container">
      <div className="eyebrow">
        COMPANY PORTAL
      </div>

      <h1>Participate without controlling.</h1>

      <p className="lead">
        Companies may respond to employee
        experiences. They cannot remove reviews,
        change scores or reveal anonymous
        contributors.
      </p>

      {query.success && (
        <div className="successBanner">
          {query.success}
        </div>
      )}

      {query.error && (
        <div className="errorBanner">
          {query.error}
        </div>
      )}

      <section className="panel">
        <h2>Claim a company</h2>

        <form
          action={submitEmployerClaimAction}
          className="formGrid"
        >
          <label>
            Company
            <CompanyPicker companies={companies} required />
          </label>

          <label>
            Corporate email
            <input
              name="workEmail"
              type="email"
              required
              placeholder="you@company.com"
            />
          </label>

          <button className="primaryButton">
            Submit claim
          </button>
        </form>

        {!!claims.length && (
          <div className="miniList">
            {claims.map((claim) => (
              <div
                className="miniRow"
                key={claim.id}
              >
                <strong>
                  {claim.company.name}
                </strong>

                <span className="statusBadge">
                  {claim.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {approvedClaims.map((claim) => (
        <section
          className="panel"
          key={claim.id}
        >
          <div className="eyebrow">
            VERIFIED REPRESENTATIVE
          </div>

          <h2>{claim.company.name}</h2>

          <form
            action={submitCompanyResponseAction}
            className="formStack"
          >
            <input
              type="hidden"
              name="claimId"
              value={claim.id}
            />

            <label>
              Respond to
              <select name="storyId">
                <option value="">
                  Company profile generally
                </option>

                {claim.company.stories.map(
                  (story) => (
                    <option
                      value={story.id}
                      key={story.id}
                    >
                      Former {story.roleFamily} —{" "}
                      {story.reasonForLeaving.slice(
                        0,
                        60
                      )}
                      …
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Company response
              <textarea
                name="body"
                rows={6}
                minLength={30}
                maxLength={4000}
                required
              />
            </label>

            <button className="primaryButton">
              Submit response
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
