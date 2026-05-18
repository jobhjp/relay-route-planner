import type { Section } from "../types/section";

const TOTAL_SECTION_COUNT = 46;

export const sections: Section[] = Array.from(
  { length: TOTAL_SECTION_COUNT },
  (_, index) => {
    const sectionNumber = index + 1;

    return {
      id: `section-${sectionNumber}`,
      order: sectionNumber,
      name: `Section ${sectionNumber}`,
      startPoint: "",
      endPoint: "",
      distanceKm: 0,
      startElevationM: 0,
      endElevationM: 0,
      elevationDiffM: 0,
      difficulty: "normal",
    };
  }
);