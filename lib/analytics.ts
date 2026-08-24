import {
  DIMENSION_LABELS,
  MIN_SAMPLE_SIZE,
  REASON_LABELS,
  type ExitReasonValue
} from "@/lib/constants";

type AnalyticsStory = {
  primaryReason: string;
  otherReasons: string[];

  managementScore: number;
  compensationScore: number;
  workLifeScore: number;
  careerGrowthScore: number;
  learningScore: number;
  cultureScore: number;
  jobSecurityScore: number;

  createdAt: Date;
};

const dimensionKeys = [
  "managementScore",
  "compensationScore",
  "workLifeScore",
  "careerGrowthScore",
  "learningScore",
  "cultureScore",
  "jobSecurityScore"
] as const;

function average(numbers: number[]) {
  if (!numbers.length) return 0;

  return (
    numbers.reduce((sum, number) => sum + number, 0) /
    numbers.length
  );
}

export function companyAnalytics(stories: AnalyticsStory[]) {
  const dimensions = dimensionKeys.map((key) => ({
    key,
    label: DIMENSION_LABELS[key],
    score: Math.round(
      average(stories.map((story) => story[key])) * 20
    )
  }));

  const overall =
    stories.length >= MIN_SAMPLE_SIZE
      ? Math.round(
          average(
            stories.flatMap((story) =>
              dimensionKeys.map((key) => story[key])
            )
          ) * 20
        )
      : null;

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
      percentage: stories.length
        ? Math.round((count / stories.length) * 100)
        : 0
    }))
    .sort((a, b) => b.count - a.count);

  const timelineMap = new Map<number, AnalyticsStory[]>();

  for (const story of stories) {
    const year = story.createdAt.getFullYear();

    timelineMap.set(year, [
      ...(timelineMap.get(year) || []),
      story
    ]);
  }

  const timeline = [...timelineMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yearStories]) => ({
      year,
      count: yearStories.length,

      score:
        yearStories.length >= MIN_SAMPLE_SIZE
          ? Math.round(
              average(
                yearStories.flatMap((story) =>
                  dimensionKeys.map((key) => story[key])
                )
              ) * 20
            )
          : null,

      topReason:
        companyAnalyticsWithoutTimeline(
          yearStories
        ).reasonBreakdown[0] || null
    }));

  const strongestDimension = [...dimensions].sort(
    (a, b) => b.score - a.score
  )[0];

  const weakestDimension = [...dimensions].sort(
    (a, b) => a.score - b.score
  )[0];

  const topReason = reasonBreakdown[0];

  const summary =
    stories.length < MIN_SAMPLE_SIZE
      ? "There is not enough employee data yet to calculate a reliable overall workplace summary."
      : `${strongestDimension.label} is currently the strongest-rated area, while ${topReason?.label ?? weakestDimension.label} is a major theme in employee departures.`;

  return {
    sampleSize: stories.length,
    overall,
    dimensions,
    reasonBreakdown,
    timeline,
    strongestDimension,
    weakestDimension,
    topReason,
    summary
  };
}

function companyAnalyticsWithoutTimeline(
  stories: AnalyticsStory[]
) {
  const reasons = new Map<string, number>();

  for (const story of stories) {
    const values = new Set([
      story.primaryReason,
      ...story.otherReasons
    ]);

    for (const reason of values) {
      reasons.set(
        reason,
        (reasons.get(reason) || 0) + 1
      );
    }
  }

  return {
    reasonBreakdown: [...reasons.entries()]
      .map(([reason, count]) => ({
        reason,
        label:
          REASON_LABELS[
            reason as ExitReasonValue
          ] || reason,
        count
      }))
      .sort((a, b) => b.count - a.count)
  };
}
