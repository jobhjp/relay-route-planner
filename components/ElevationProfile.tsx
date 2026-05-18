import { sections } from "../data/sections";

function getBarColor(elevationDiffM: number) {
  if (elevationDiffM > 10) {
    return "bg-red-500";
  }

  if (elevationDiffM < -10) {
    return "bg-blue-500";
  }

  return "bg-green-500";
}

function getBarHeight(elevationDiffM: number) {
  const height = Math.min(Math.abs(elevationDiffM), 100);
  return Math.max(height, 10);
}

export default function ElevationProfile() {
  return (
    <div className="mt-8 rounded-xl bg-white p-6 shadow-md">
      <h2 className="text-2xl font-semibold text-gray-900">
        Elevation Profile
      </h2>

      <div className="mt-6 flex items-end gap-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className="flex flex-1 flex-col items-center"
          >
            <div
              className={`w-full rounded-t ${getBarColor(
                section.elevationDiffM
              )}`}
              style={{
                height: `${getBarHeight(
                  section.elevationDiffM
                )}px`,
              }}
            />

            <div className="mt-2 text-xs font-medium text-gray-700">
              {section.order}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}