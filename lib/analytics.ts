import { MIN_SAMPLE_SIZE, REASON_LABELS, type ExitReasonValue } from "@/lib/constants";

type AnalyticsStory = {
  primaryReason: string;
  otherReasons: string[];
};

export function companyAnalytics(stories: AnalyticsStory[]) {
  const reasons = new Map<string, number>();

  for (const story of stories) {
    const reasonsInStory = new Set([
      story.primaryReason,
      ...story.otherReasons
    ]);

    for (const reason of reasonsInStory) {
      reasons.set(
        reason,
        (reasons.get(reason) || 0) + 1
      );
    }
  }

  const reasonBreakdown = [...reasons.entries()]
    .map(([reason, count]) => ({
      reason,
      label:
        REASON_LABELS[reason as ExitReasonValue] ||
        reason,
      count,
      percentage: stories.length >= 20
        ? Math.round((count / stories.length) * 100)
        : null
    }))
    .sort((a, b) => b.count - a.count);

  const summary =
    stories.length < MIN_SAMPLE_SIZE
      ? "Individual experiences are shown below. LinkedOut waits for at least five contributors before surfacing early patterns."
      : stories.length < 20
        ? "Early patterns based on a small group of former employees. These are mention counts, not percentages."
        : `Patterns from ${stories.length} published former-employee experiences.`;

  return {
    sampleSize: stories.length,
    aggregateAllowed: stories.length >= MIN_SAMPLE_SIZE,
    percentagesAllowed: stories.length >= 20,
    reasonBreakdown,
    summary
  };
}
