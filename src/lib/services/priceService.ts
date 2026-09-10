export type Condition = "working" | "partially_working" | "not_working";

export const CONDITIONS: { value: Condition; label: string; factor: number }[] = [
  { value: "working", label: "Working", factor: 1 },
  { value: "partially_working", label: "Partially Working", factor: 0.8 },
  { value: "not_working", label: "Not Working", factor: 0.6 },
];

export function conditionFactor(condition: Condition): number {
  return CONDITIONS.find((c) => c.value === condition)?.factor ?? 1;
}

export function conditionLabel(condition: string): string {
  return CONDITIONS.find((c) => c.value === condition)?.label ?? condition;
}

/**
 * Indicative value = weight x the recycler's own rate x a condition factor.
 * Returns null when no recycler rate exists — the app never invents a rate.
 */
export function indicativePrice(weightKg: number, ratePerKg: number | null, condition: Condition): number | null {
  if (!ratePerKg || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  return Math.round(weightKg * ratePerKg * conditionFactor(condition));
}

export function formatRupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}
