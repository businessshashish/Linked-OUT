import TrustPage from "@/components/TrustPage";

export default function ReportConcernPage() {
  return <TrustPage eyebrow="REPORT A CONCERN" title="Help keep LinkedOut safe and useful." intro="Report content that exposes someone, includes confidential information, attacks a person, or appears misleading or spammy." sections={[{ title: "Report an experience", body: ["Open the experience and choose Report this story. Signed-in reports go directly to the moderation queue with the relevant experience attached."] }, { title: "Other safety concerns", body: ["For account, legal, or urgent concerns, contact the team without including unnecessary private evidence in your first message."] }, { title: "What happens next", body: ["A human reviewer assesses the report against the Community Rules. We may remove content, request changes, or leave legitimate firsthand criticism in place."] }]} />;
}
