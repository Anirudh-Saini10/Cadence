import type { UoMType } from "@/types/database";

/** Thrust areas — would be admin-configurable in v2. */
export const THRUST_AREAS = [
  "Revenue Growth",
  "Customer Excellence",
  "Operational Quality",
  "People Development",
  "Innovation",
  "Cost Optimization",
] as const;

export const UOM_OPTIONS: { value: UoMType; label: string }[] = [
  { value: "min",      label: "Min — higher is better" },
  { value: "max",      label: "Max — lower is better" },
  { value: "timeline", label: "Timeline — % complete" },
  { value: "zero",     label: "Zero — 0 = success" },
];

export const MAX_GOALS = 8;
export const MIN_WEIGHTAGE = 10;
export const TARGET_WEIGHTAGE_TOTAL = 100;
