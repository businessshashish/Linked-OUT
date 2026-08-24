import {
  reportStoryAction
} from "@/app/actions";

import {
  REASON_LABELS,
  type ExitReasonValue
} from "@/lib/constants";

type Response = {
  id: string;
  body: string;
  authorLabel: string;
  createdAt: Date;
};

type StoryProps = {
  id: string;
  authorAlias: string;

  jobTitle: string;
  location: string;
  tenureMonths: number;

  primaryReason: string;
  otherReasons: string[];

  positiveExperience: string;
  reasonForLeaving: string;
  wishIKnew: string;

  recommendCompany: string;
  workHereAgain: string;

  createdAt: Date;
  verified: boolean;

  responses: Response[];

  canReport: boolean;
  imageUrl?: string | null;
};

function tenure(months: number) {
  if (months < 12) {
    return `${months} months`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return remainingMonths
    ? `${years}y ${remainingMonths}m`
    : `${years} ${years === 1 ? "year" : "years"}`;
}

export default function StoryCard({
  story
}: {
  story: StoryProps;
}) {
  const reasons = [
    story.primaryReason,
    ...story.otherReasons
  ];

  return (
    <article className="storyCard">
      <div className="storyHeader">
        <div>
          <strong>{story.authorAlias}</strong>

          {story.verified && (
            <span className="verified">
              Employment verified
            </span>
          )}

          <div className="muted">
            Former {story.jobTitle} ·{" "}
            {story.location}
          </div>

          <div className="muted">
            Worked here:{" "}
            {tenure(story.tenureMonths)}
          </div>
        </div>
      </div>

      <div className="tagRow">
        {reasons.map((reason) => (
          <span
            key={reason}
            className="tag"
          >
            {REASON_LABELS[
              reason as ExitReasonValue
            ] || reason}
          </span>
        ))}
      </div>

      <div className="storySection">
        <h4>What was good</h4>
        <p>{story.positiveExperience}</p>
      </div>

      <div className="storySection">
        <h4>Why I left</h4>
        <p>{story.reasonForLeaving}</p>
      </div>

      <div className="storySection highlight">
        <h4>What I wish I knew</h4>
        <p>{story.wishIKnew}</p>
      </div>

      {story.imageUrl && (
        <img className="storyImage" src={story.imageUrl} alt="Shared workplace experience" />
      )}

      <div className="storyAnswers">
        <span>
          Recommend:{" "}
          <strong>
            {story.recommendCompany}
          </strong>
        </span>

        <span>
          Work here again:{" "}
          <strong>{story.workHereAgain}</strong>
        </span>
      </div>

      {story.responses.map((response) => (
        <div
          className="companyResponse"
          key={response.id}
        >
          <strong>Company response</strong>

          <p>{response.body}</p>

          <small>
            {response.authorLabel}
          </small>
        </div>
      ))}

      {story.canReport && (
        <details className="reportBox">
          <summary>Report this story</summary>

          <form action={reportStoryAction}>
            <input
              type="hidden"
              name="storyId"
              value={story.id}
            />

            <select name="reason" required>
              <option value="">
                Select reason
              </option>

              <option value="Personal information">
                Personal information
              </option>

              <option value="False or misleading">
                False or misleading
              </option>

              <option value="Harassment">
                Harassment
              </option>

              <option value="Confidential information">
                Confidential information
              </option>

              <option value="Other">
                Other
              </option>
            </select>

            <textarea
              name="details"
              placeholder="Optional details"
              maxLength={1000}
            />

            <button className="secondaryButton">
              Submit report
            </button>
          </form>
        </details>
      )}
    </article>
  );
}
