export const EXIT_REASON_VALUES = [
  "MANAGEMENT",
  "COMPENSATION",
  "WORKLOAD",
  "CAREER_GROWTH",
  "CULTURE",
  "TEAM_POLITICS",
  "RECOGNITION",
  "JOB_SECURITY",
  "LAYOFF_RESTRUCTURING",
  "ROLE_MISMATCH",
  "FLEXIBILITY_RTO",
  "RELOCATION",
  "BENEFITS",
  "ETHICS_VALUES",
  "BETTER_OPPORTUNITY",
  "PERSONAL"
] as const;

export type ExitReasonValue = (typeof EXIT_REASON_VALUES)[number];

export const REASON_LABELS: Record<ExitReasonValue, string> = {
  MANAGEMENT: "Management & leadership",
  COMPENSATION: "Compensation",
  WORKLOAD: "Workload / work-life balance",
  CAREER_GROWTH: "Career growth",
  CULTURE: "Workplace culture",
  TEAM_POLITICS: "Team dynamics / politics",
  RECOGNITION: "Recognition",
  JOB_SECURITY: "Job security",
  LAYOFF_RESTRUCTURING: "Layoff / restructuring",
  ROLE_MISMATCH: "Role mismatch",
  FLEXIBILITY_RTO: "Flexibility / return-to-office",
  RELOCATION: "Relocation",
  BENEFITS: "Benefits",
  ETHICS_VALUES: "Ethics / values",
  BETTER_OPPORTUNITY: "Better opportunity",
  PERSONAL: "Personal reasons"
};

export const DIMENSION_LABELS = {
  managementScore: "Management",
  compensationScore: "Compensation",
  workLifeScore: "Work-life balance",
  careerGrowthScore: "Career growth",
  learningScore: "Learning",
  cultureScore: "Culture",
  jobSecurityScore: "Job security"
} as const;

export const MIN_SAMPLE_SIZE = 5;
