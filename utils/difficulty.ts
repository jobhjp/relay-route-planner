export type Difficulty = "easy" | "medium" | "hard";

export function calculateDifficulty(
  distanceKm: number,
  elevationGainM: number
): Difficulty {
  if (elevationGainM >= 100) {
    return "hard";
  }

  if (elevationGainM >= 50) {
    return "medium";
  }

  return "easy";
}

export function getDifficultyStyle(difficulty: Difficulty): string {
  switch (difficulty) {
    case "hard":
      return "bg-red-100 text-red-700";

    case "medium":
      return "bg-yellow-100 text-yellow-700";

    default:
      return "bg-green-100 text-green-700";
  }
}