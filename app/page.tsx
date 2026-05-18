"use client";

import { useState } from "react";
import { sections } from "../data/sections";
import { initialRunners } from "../data/runners";
import ElevationProfile from "../components/ElevationProfile";
import RunnerRegistrationModal from "../components/RunnerRegistrationModal";
import { calculateDifficulty } from "../utils/difficulty";
import type { Runner } from "../types/runner";

const MAX_RUNNER_COUNT = 100;

function getElevationStyle(elevationDiffM: number) {
  if (elevationDiffM > 10) return "bg-red-100 text-red-700";
  if (elevationDiffM < -10) return "bg-blue-100 text-blue-700";
  return "bg-green-100 text-green-700";
}

function getElevationLabel(elevationDiffM: number) {
  if (elevationDiffM > 10) return "Uphill";
  if (elevationDiffM < -10) return "Downhill";
  return "Flat";
}

export default function Home() {
  const [runners, setRunners] = useState<Runner[]>(initialRunners);

  const [runnerAssignments, setRunnerAssignments] = useState<
    Record<string, string[]>
  >({});

  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [routeUrls, setRouteUrls] = useState<Record<string, string>>({});
  const [isRunnerModalOpen, setIsRunnerModalOpen] = useState(false);

  function handleRegisterRunner(runner: Runner) {
    if (runners.length >= MAX_RUNNER_COUNT) {
      alert("You can register up to 100 runners.");
      return;
    }

    setRunners((currentRunners) => [...currentRunners, runner]);
  }

  function toggleRunner(sectionId: string, runnerId: string) {
    setRunnerAssignments((currentAssignments) => {
      const currentRunnerIds = currentAssignments[sectionId] ?? [];
      const isSelected = currentRunnerIds.includes(runnerId);

      const nextRunnerIds = isSelected
        ? currentRunnerIds.filter((id) => id !== runnerId)
        : [...currentRunnerIds, runnerId];

      return {
        ...currentAssignments,
        [sectionId]: nextRunnerIds,
      };
    });
  }

  function getAssignedRunnerNames(sectionId: string) {
    const assignedRunnerIds = runnerAssignments[sectionId] ?? [];

    if (assignedRunnerIds.length === 0) {
      return "Unassigned";
    }

    return runners
      .filter((runner) => assignedRunnerIds.includes(runner.id))
      .map((runner) => runner.englishName)
      .join(", ");
  }

  function handleRouteUrlChange(sectionId: string, routeUrl: string) {
    setRouteUrls((currentRouteUrls) => ({
      ...currentRouteUrls,
      [sectionId]: routeUrl,
    }));
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-blue-600">
            Relay Route Planner
          </h1>

          <p className="mt-4 text-lg text-gray-700">
            Manage relay running routes and runner assignments.
          </p>
        </div>

        <button
          type="button"
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white"
          onClick={() => setIsRunnerModalOpen(true)}
        >
          Register Runner
        </button>
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 shadow-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            Route Sections
          </h2>

          <p className="text-sm text-gray-600">
            Registered runners: {runners.length} / {MAX_RUNNER_COUNT}
          </p>
        </div>

        <table className="mt-4 w-full border-collapse text-gray-900">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">
                Section
              </th>
              <th className="border border-gray-300 p-2 text-left">
                Distance (km)
              </th>
              <th className="border border-gray-300 p-2 text-left">
                Elevation Diff (m)
              </th>
              <th className="border border-gray-300 p-2 text-left">
                Type
              </th>
              <th className="border border-gray-300 p-2 text-left">
                Difficulty
              </th>
              <th className="border border-gray-300 p-2 text-left">
                Route URL
              </th>
              <th className="border border-gray-300 p-2 text-left">
                Runner
              </th>
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => (
              <tr key={section.id}>
                <td className="border border-gray-300 p-2">
                  {section.name}
                </td>

                <td className="border border-gray-300 p-2">
                  {section.distanceKm}
                </td>

                <td className="border border-gray-300 p-2">
                  {section.elevationDiffM}
                </td>

                <td className="border border-gray-300 p-2">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${getElevationStyle(
                      section.elevationDiffM
                    )}`}
                  >
                    {getElevationLabel(section.elevationDiffM)}
                  </span>
                </td>

                <td className="border border-gray-300 p-2">
                  {calculateDifficulty(
                    section.distanceKm,
                    section.elevationDiffM
                  )}
                </td>

                <td className="border border-gray-300 p-2">
                  <input
                    type="url"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="Paste route URL"
                    value={routeUrls[section.id] ?? ""}
                    onChange={(event) =>
                      handleRouteUrlChange(section.id, event.target.value)
                    }
                  />
                </td>

                <td className="relative border border-gray-300 p-2">
                  <button
                    type="button"
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-left text-gray-900"
                    onClick={() =>
                      setOpenSectionId(
                        openSectionId === section.id ? null : section.id
                      )
                    }
                  >
                    {getAssignedRunnerNames(section.id)}
                  </button>

                  {openSectionId === section.id && (
                    <div className="absolute z-10 mt-2 w-64 rounded border border-gray-300 bg-white p-3 shadow-lg">
                      {runners.length === 0 && (
                        <p className="p-2 text-sm text-gray-500">
                          No runners registered.
                        </p>
                      )}

                      {runners.map((runner) => {
                        const assignedRunnerIds =
                          runnerAssignments[section.id] ?? [];

                        const isChecked = assignedRunnerIds.includes(
                          runner.id
                        );

                        return (
                          <label
                            key={runner.id}
                            className="flex cursor-pointer items-center gap-2 p-2 text-gray-900"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                toggleRunner(section.id, runner.id)
                              }
                            />
                            <span>{runner.englishName}</span>
                          </label>
                        );
                      })}

                      <button
                        type="button"
                        className="mt-2 w-full rounded bg-blue-600 px-3 py-2 text-white"
                        onClick={() => setOpenSectionId(null)}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ElevationProfile />

      <RunnerRegistrationModal
        isOpen={isRunnerModalOpen}
        onClose={() => setIsRunnerModalOpen(false)}
        onRegister={handleRegisterRunner}
      />
    </main>
  );
}