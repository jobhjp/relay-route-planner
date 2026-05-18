export type ParticipationLevel = "high" | "medium" | "low";

export type Runner = {
  id: string;
  englishName: string;
  tenKmRecord: string;
  participationLevel: ParticipationLevel;
};