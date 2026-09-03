import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

import {
  EXIT_REASON_VALUES,
  REASON_LABELS
} from "@/lib/constants";

import { createStoryAction, updateStoryAction } from "@/app/actions";
import CompanyPicker from "@/components/CompanyPicker";
import OtherReasonsPicker from "@/components/OtherReasonsPicker";
import VoiceExitInterview from "@/components/VoiceExitInterview";
import FormAutofillBridge from "@/components/FormAutofillBridge";
import ShareDraftGuard from "@/components/ShareDraftGuard";
import FunnelTracker from "@/components/FunnelTracker";
import PrivacyCheck from "@/components/PrivacyCheck";
import { resolveCompany } from "@/lib/company-search";

export default async function SubmitPage({
  searchParams
}: {
  searchParams: Promise<{
    company?: string;
    edit?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  const query = await searchParams;

  const companies = await prisma.company.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const editStory = user?.publicIdentity && query.edit
    ? await prisma.exitStory.findFirst({
        where: { id: query.edit, publicIdentityId: user.publicIdentity.id }
      })
    : null;
  const selected = editStory?.companyId || resolveCompany(query.company, companies)?.id || "";
  const action = editStory ? updateStoryAction : createStoryAction;

  return (
    <div className="narrowContainer">
      <FunnelTracker event="share_started" source={query.company} />
      <div className="eyebrow">
        {editStory ? "EDIT EXPERIENCE" : "EXIT STORY"}
      </div>

      <h1>Why did you leave?</h1>

      <p className="lead">
        Share the essentials. LinkedOut publishes broad role and optional country only—not your account identity, exact title, tenure, or departure date.
      </p>

      {!user && <div className="notice"><strong>Start before signing up.</strong> Complete the AI interview or manual form first. We’ll securely keep the text fields in this browser and ask you to create an account only when you submit.</div>}

      {query.error && (
        <div className="errorBanner">
          {query.error}
        </div>
      )}

      <VoiceExitInterview companies={companies} />

      <form
        action={action}
        className="formStack"
        data-share-form="true"
      >
        <FormAutofillBridge />
        <ShareDraftGuard authenticated={Boolean(user)} />
        {editStory && <input type="hidden" name="storyId" value={editStory.id} />}
        <fieldset>
          <legend>Employment</legend>

          <label>
            Company
            <CompanyPicker companies={companies} selectedId={selected} required />
          </label>

          <label>
            Broad role
            <input
              name="roleFamily"
              required
              maxLength={80}
              placeholder="e.g. Engineering, Design, Operations"
              defaultValue={editStory?.roleFamily || ""}
              list="role-options"
            />
            <datalist id="role-options">
              <option value="Engineering" />
              <option value="Product" />
              <option value="Design" />
              <option value="Sales" />
              <option value="Marketing" />
              <option value="Operations" />
              <option value="Customer support" />
              <option value="Finance" />
              <option value="People / HR" />
            </datalist>
          </label>

          <label>
            Country <span className="muted">(optional)</span>
            <input
              name="country"
              maxLength={100}
              placeholder="e.g. India"
              defaultValue={editStory?.location || ""}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Why you left</legend>

          <label>
            Primary reason
            <select
              name="primaryReason"
              required
              defaultValue={editStory?.primaryReason || ""}
            >
              <option value="" disabled>Select the main reason</option>
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

          <OtherReasonsPicker initialReasons={editStory?.otherReasons || []} />
        </fieldset>

        <fieldset>
          <legend>Your experience</legend>

          <label>
            What was genuinely good?
            <textarea
              name="positiveExperience"
              required
              minLength={10}
              maxLength={4000}
              rows={5}
              defaultValue={editStory?.positiveExperience || ""}
            />
          </label>

          <label>
            Anything else about why you left? <span className="muted">(optional)</span>
            <textarea
              name="reasonForLeaving"
              maxLength={5000}
              rows={7}
              defaultValue={editStory?.reasonForLeaving || ""}
            />
          </label>

          <label>
            What do you wish you knew before
            accepting the job?
            <textarea
              name="wishIKnew"
              required
              minLength={10}
              maxLength={3000}
              rows={5}
              defaultValue={editStory?.wishIKnew || ""}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Final questions</legend>

          <label>
            Would you recommend this company?
            <select
              name="recommendCompany"
              required
              defaultValue={editStory?.recommendCompany || ""}
            >
              <option value="" disabled>Choose one</option>
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
              defaultValue={editStory?.workHereAgain || ""}
            >
              <option value="" disabled>Choose one</option>
              <option value="YES">Yes</option>
              <option value="MAYBE">
                Maybe
              </option>
              <option value="NO">No</option>
            </select>
          </label>
        </fieldset>

        <PrivacyCheck />

        <div className="notice"><strong>Your story is anonymous.</strong> Your account email is never displayed with a public experience. Employers never receive contributor identity. Voice transcription and analysis stay on-device; recordings are not uploaded or stored. Every experience is reviewed before publishing.</div>

        <button className="primaryButton">
          {editStory ? "Save and resubmit for review" : "Submit experience"}
        </button>
      </form>
    </div>
  );
}
