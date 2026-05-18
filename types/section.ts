export type Section = {
  id: string;
  order: number;
  name: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  startElevationM: number;
  endElevationM: number;
  elevationDiffM: number;
  difficulty: "easy" | "normal" | "hard";
  routeUrl?: string;

};