import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import {
  deleteAccountAction,
  requestVerificationAction
} from "@/app/actions";

import ProfilePhotoForm from "@/components/ProfilePhotoForm";
import CompanyPicker from "@/components/CompanyPicker";

export default async function AccountPage({
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

  const stories = user.publicIdentity
    ? await prisma.exitStory.findMany({
        where: {
          publicIdentityId:
            user.publicIdentity.id
        },

        include: {
          company: true
        },

        orderBy: {
          createdAt: "desc"
        }
      })
    : [];

  const verifications =
    await prisma.employmentVerification.findMany({
      where: {
        userId: user.id
      },

      include: {
        company: true
      },

      orderBy: {
        createdAt: "desc"
      }
    });

  return (
    <div className="container">
      <div className="sectionHeader">
        <div>
          <div className="eyebrow">
            ACCOUNT
          </div>

          <h1>Your LinkedOut account</h1>
        </div>
      </div>

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

      <section className="twoColumn">
        <div className="panel">
          <h2>Identity</h2>

          <div className="accountProfileHeader">
            {user.avatarUrl ? (
              <img className="accountAvatar" src={user.avatarUrl} alt="Your profile photo" />
            ) : (
              <div className="accountAvatar accountAvatarFallback">{user.publicIdentity?.alias[0] || "A"}</div>
            )}
            <div>
              <strong>{user.publicIdentity?.alias}</strong>
              <p className="muted">Private profile photo</p>
            </div>
          </div>

          <ProfilePhotoForm />

          <p>
            Private account:{" "}
            <strong>{user.email}</strong>
          </p>

          <p>
            Public identity:{" "}
            <strong>
              {user.publicIdentity?.alias}
            </strong>
          </p>

          <p className="muted">
            Your email is never rendered on
            public employee stories.
          </p>
        </div>

        <div className="panel">
          <h2>Your stories</h2>

          {!stories.length && (
            <p className="muted">
              You have not submitted a story.
            </p>
          )}

          {stories.map((story) => (
            <div
              className="miniRow"
              key={story.id}
            >
              <div>
                <strong>
                  {story.company.name}
                </strong>

                <div className="muted">
                  {story.jobTitle}
                </div>
              </div>

              <span className="statusBadge">
                {story.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">
          EMPLOYMENT VERIFICATION
        </div>

        <h2>
          Verify that you worked somewhere
        </h2>

        <p className="muted">
          The MVP stores verification requests but
          does not yet upload sensitive employment
          documents. Document verification is
          handled manually.
        </p>

        <form
          action={requestVerificationAction}
          className="formGrid"
        >
          <label>
            Company
            <CompanyPicker companies={companies} required />
          </label>

          <label>
            Method
            <select name="method">
              <option value="WORK_EMAIL">
                Former/current work email
              </option>

              <option value="DOCUMENT">
                Employment document
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>
          </label>

          <label>
            Work email
            <input
              name="workEmail"
              type="email"
              placeholder="you@company.com"
            />
          </label>

          <label>
            Evidence note
            <input
              name="evidenceNote"
              placeholder="e.g. relieving letter available"
            />
          </label>

          <button className="primaryButton">
            Request verification
          </button>
        </form>

        {!!verifications.length && (
          <div className="miniList">
            {verifications.map(
              (verification) => (
                <div
                  className="miniRow"
                  key={verification.id}
                >
                  <strong>
                    {
                      verification.company
                        .name
                    }
                  </strong>

                  <span className="statusBadge">
                    {verification.status}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="panel dangerPanel">
        <h2>Delete account</h2>

        <p>
          Deleting your account removes the private
          account identity. Published workplace
          stories remain anonymised and disconnected
          from your deleted account.
        </p>

        <form action={deleteAccountAction}>
          <label>
            Type DELETE
            <input
              name="confirmation"
              required
            />
          </label>

          <button className="dangerButton">
            Delete account
          </button>
        </form>
      </section>
    </div>
  );
}
