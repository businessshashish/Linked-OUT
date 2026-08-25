import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import {
  EXIT_REASON_VALUES,
  REASON_LABELS
} from "@/lib/constants";

import { createStoryAction } from "@/app/actions";
import CompanyPicker from "@/components/CompanyPicker";
import OtherReasonsPicker from "@/components/OtherReasonsPicker";
import RatingSlider from "@/components/RatingSlider";
import StoryImageInput from "@/components/StoryImageInput";
import VoiceExitInterview from "@/components/VoiceExitInterview";
import FormAutofillBridge from "@/components/FormAutofillBridge";

const ratings = [
  ["managementScore", "Management"],
  ["compensationScore", "Compensation"],
  ["workLifeScore", "Work-life balance"],
  ["careerGrowthScore", "Career growth"],
  ["learningScore", "Learning"],
  ["cultureScore", "Culture"],
  ["jobSecurityScore", "Job security"]
] as const;

export default async function SubmitPage({
  searchParams
}: {
  searchParams: Promise<{
    company?: string;
    error?: string;
  }>;
}) {
  await requireUser();

  const query = await searchParams;

  const companies = await prisma.company.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const selected =
    companies.find(
      (company) =>
        company.slug === query.company
    )?.id || "";

  return (
    <div className="narrowContainer">
      <div className="eyebrow">
        EXIT STORY
      </div>

      <h1>Why did you leave?</h1>

      <p className="lead">
        Share your firsthand workplace
        experience. Talk about systems and
        experiences rather than naming private
        individuals.
      </p>

      {query.error && (
        <div className="errorBanner">
          {query.error}
        </div>
      )}

      <VoiceExitInterview companies={companies} />

      <form
        action={createStoryAction}
        className="formStack"
        data-share-form="true"
      >
        <FormAutofillBridge />
        <fieldset>
          <legend>Employment</legend>

          <label>
            Company
            <CompanyPicker companies={companies} selectedId={selected} required />
          </label>

          <label>
            Job title
            <input
              name="jobTitle"
              required
              maxLength={100}
              placeholder="Software Engineer"
            />
          </label>

          <label>
            Role family
            <input
              name="roleFamily"
              required
              maxLength={80}
              placeholder="Engineering"
            />
          </label>

          <label>
            Location
            <input
              name="location"
              required
              maxLength={100}
              placeholder="Bengaluru"
            />
          </label>

          <label>
            Months worked there
            <input
              name="tenureMonths"
              type="number"
              min={1}
              max={600}
              required
              placeholder="24"
            />
          </label>

          <label>
            How did the employment end?
            <select
              name="departureType"
              required
            >
              <option value="RESIGNED">
                I resigned
              </option>

              <option value="LAID_OFF">
                I was laid off
              </option>

              <option value="TERMINATED">
                Employment was terminated
              </option>

              <option value="CONTRACT_ENDED">
                Contract ended
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>Why you left</legend>

          <label>
            Primary reason
            <select
              name="primaryReason"
              required
            >
              {EXIT_REASON_VALUES.map(
                (reason) => (
                  <option
                    value={reason}
                    key={reason}
                  >
                    {REASON_LABELS[reason]}
                  </option>
                )
              )}
            </select>
          </label>

          <OtherReasonsPicker />
        </fieldset>

        <fieldset>
          <legend>Employee sentiment</legend>

          {ratings.map(([name, label]) => (
            <RatingSlider key={name} name={name} label={label} />
          ))}
        </fieldset>

        <fieldset>
          <legend>Your experience</legend>

          <label>
            What was genuinely good?
            <textarea
              name="positiveExperience"
              required
              minLength={20}
              maxLength={4000}
              rows={5}
            />
          </label>

          <label>
            What ultimately made you leave?
            <textarea
              name="reasonForLeaving"
              required
              minLength={30}
              maxLength={5000}
              rows={7}
            />
          </label>

          <label>
            What do you wish you knew before
            accepting the job?
            <textarea
              name="wishIKnew"
              required
              minLength={20}
              maxLength={3000}
              rows={5}
            />
          </label>

          <StoryImageInput />
        </fieldset>

        <fieldset>
          <legend>Final questions</legend>

          <label>
            Would you recommend this company?
            <select
              name="recommendCompany"
              required
            >
              <option value="YES">Yes</option>
              <option value="MAYBE">
                Maybe
              </option>
              <option value="NO">No</option>
            </select>
          </label>

          <label>
            Would you work here again?
            <select
              name="workHereAgain"
              required
            >
              <option value="YES">Yes</option>
              <option value="MAYBE">
                Maybe
              </option>
              <option value="NO">No</option>
            </select>
          </label>
        </fieldset>

        <div className="notice">
          Your public alias is separate from your
          login account. Submissions are moderated
          before becoming public.
        </div>

        <button className="primaryButton">
          Submit experience
        </button>
      </form>
    </div>
  );
}
