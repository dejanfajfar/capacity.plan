/**
 * Proficiency/Productivity Level Presets
 *
 * These presets represent how productive a person is expected to be on a specific
 * project based on their expertise/familiarity with the technology, domain, or tools.
 *
 * The productivity factor is a multiplier (0.0 - 1.0) applied to available hours:
 * Effective Hours = Available Hours × Productivity Factor × Allocation %
 *
 * Note: Even experts don't have 1.0 productivity due to meetings, planning,
 * context-switching, research, and other non-coding activities.
 */

export interface ProficiencyLevel {
  value: string;
  factor: number;
  label: string;
  description: string;
}

export const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  {
    value: "master",
    factor: 0.9,
    label: "Master",
    description:
      "Subject matter expert with deep mastery. Can architect solutions, mentor others, and maintain highest productivity.",
  },
  {
    value: "expert",
    factor: 0.8,
    label: "Expert",
    description:
      "Deep expertise and experience. Works independently, rarely needs guidance, high efficiency.",
  },
  {
    value: "advanced",
    factor: 0.65,
    label: "Advanced",
    description:
      "Strong knowledge and experience. Works independently most of the time, occasional guidance needed.",
  },
  {
    value: "proficient",
    factor: 0.5,
    label: "Proficient",
    description:
      "Solid understanding and competence. Baseline productivity. Regular but manageable guidance needed.",
  },
  {
    value: "intermediate",
    factor: 0.35,
    label: "Intermediate",
    description:
      "Developing skills and knowledge. Regular guidance and code reviews required. Learning curve impacts output.",
  },
  {
    value: "beginner",
    factor: 0.2,
    label: "Beginner",
    description:
      "Basic familiarity only. Frequent support and mentoring required. Significant learning overhead.",
  },
  {
    value: "trainee",
    factor: 0.1,
    label: "Trainee",
    description:
      "Shadowing/training mode. Little to no prior experience. Minimal direct output, focused on learning.",
  },
];

/**
 * Default proficiency factor for new assignments
 * Set to "Proficient" (0.5) as a reasonable baseline
 */
export const DEFAULT_PROFICIENCY_FACTOR = 0.5;

/**
 * Special value indicating custom productivity factor
 */
export const CUSTOM_PROFICIENCY_VALUE = "custom";

/**
 * Get proficiency label by factor value
 * Returns the matching preset label, or formats as custom percentage
 */
export function getProficiencyLabel(factor: number): string {
  const level = PROFICIENCY_LEVELS.find((l) => l.factor === factor);
  if (level) {
    return level.label;
  }
  // If not a preset, show as custom percentage
  return `Custom (${(factor * 100).toFixed(0)}%)`;
}

/**
 * Get proficiency label with percentage
 * Used for detailed displays (e.g., "Expert (80%)")
 */
export function getProficiencyLabelWithPercentage(factor: number): string {
  const level = PROFICIENCY_LEVELS.find((l) => l.factor === factor);
  if (level) {
    return `${level.label} (${(level.factor * 100).toFixed(0)}%)`;
  }
  return `Custom (${(factor * 100).toFixed(0)}%)`;
}

/**
 * Get full proficiency level details by factor value
 * Returns the matching preset, or null if custom
 */
export function getProficiencyByFactor(
  factor: number,
): ProficiencyLevel | null {
  return PROFICIENCY_LEVELS.find((l) => l.factor === factor) || null;
}

/**
 * Find closest proficiency preset for a given factor
 * Useful for mapping arbitrary values to nearest preset
 */
export function getClosestProficiency(factor: number): ProficiencyLevel {
  let closest = PROFICIENCY_LEVELS[0];
  let minDiff = Math.abs(factor - closest.factor);

  for (const level of PROFICIENCY_LEVELS) {
    const diff = Math.abs(factor - level.factor);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }

  return closest;
}

/**
 * Check if a factor matches a preset exactly
 */
export function isPresetFactor(factor: number): boolean {
  return PROFICIENCY_LEVELS.some((l) => l.factor === factor);
}
