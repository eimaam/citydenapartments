export const BREAKFAST_CUTOFF_HOUR = 10;
export const BREAKFAST_CUTOFF_MINUTE = 30;
export const DEFAULT_BREAKFAST_MAX_DISCOUNT_PERCENTAGE = 20;

export function getMaxBreakfastDiscountPercentage(): number {
  const envVal = process.env.BREAKFAST_MAX_DISCOUNT_PERCENTAGE || process.env.MAX_BREAKFAST_DISCOUNT_PERCENTAGE;
  if (envVal !== undefined && envVal !== '') {
    const parsed = Number(envVal);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return DEFAULT_BREAKFAST_MAX_DISCOUNT_PERCENTAGE;
}

export function isPastBreakfastCutoff(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  return hour > BREAKFAST_CUTOFF_HOUR || (hour === BREAKFAST_CUTOFF_HOUR && minute >= BREAKFAST_CUTOFF_MINUTE);
}
