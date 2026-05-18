export type Difficulty = "easy" | "normal" | "hard";

/**
 * Calculate difficulty based on uphill meters per kilometer.
 *
 * easy   : < 10 m/km
 * normal : 10 - 24.9 m/km
 * hard   : >= 25 m/km
 */
export function calculateDifficulty(
  distanceKm: number,
  elevationDiffM: number
): Difficulty {
  if (distanceKm <= 0) {
    return "easy";
  }

  const uphillMeters = Math.max(elevationDiffM, 0);
  const climbRate = uphillMeters / distanceKm;

  if (climbRate >= 25) {
    return "hard";
  }

  if (climbRate >= 10) {
    return "normal";
  }

  return "easy";
}