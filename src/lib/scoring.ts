import type { UoMType } from "@/types/database";

/**
 * Mirrors public.tg_checkins_compute_score in 003_triggers.sql.
 * Used for live preview in the check-in form before the DB writes the canonical value.
 */
export function computeScore(
  uom: UoMType,
  target: number,
  actual: number
): number {
  let score = 0;
  switch (uom) {
    case "min":
      score = target === 0 ? 0 : (actual / target) * 100;
      break;
    case "max":
      score = actual === 0 ? 100 : (target / actual) * 100;
      break;
    case "timeline":
      score = actual; // treat actual as % complete
      break;
    case "zero":
      score = actual === 0 ? 100 : 0;
      break;
  }
  if (!Number.isFinite(score) || score < 0) score = 0;
  if (score > 150) score = 150;
  return Math.round(score * 100) / 100;
}

export const UOM_LABELS: Record<UoMType, string> = {
  min: "Min (higher is better)",
  max: "Max (lower is better)",
  timeline: "Timeline (% complete)",
  zero: "Zero (0 = success)",
};

export const UOM_HINT: Record<UoMType, string> = {
  min: "Achievement ÷ Target × 100",
  max: "Target ÷ Achievement × 100",
  timeline: "Enter % completion of milestone",
  zero: "Any value > 0 = 0% score",
};
