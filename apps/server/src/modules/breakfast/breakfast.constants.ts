export const BREAKFAST_CUTOFF_HOUR = 10;
export const BREAKFAST_CUTOFF_MINUTE = 30;

export function isPastBreakfastCutoff(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  return hour > BREAKFAST_CUTOFF_HOUR || (hour === BREAKFAST_CUTOFF_HOUR && minute >= BREAKFAST_CUTOFF_MINUTE);
}
