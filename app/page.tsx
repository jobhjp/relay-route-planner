"use client";

import { useEffect, useState } from "react";
import GPXParser from "gpxparser";
import { initialRunners } from "../data/runners";
import RunnerRegistrationModal from "../components/RunnerRegistrationModal";
import { calculateDifficulty } from "../utils/difficulty";
import type { Runner, ParticipationLevel } from "../types/runner";
import { supabase } from "../lib/supabase";

const MAX_RUNNER_COUNT = 100;

type RouteSection = {
  id: string;
  order: number;
  name: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  elevationGainM: number;
  routeUrl: string;
};

type SectionRouteInfo = {
  distanceKm: number;
  elevationDiffM: number;
  startPoint: string;
  endPoint: string;
};

type GpxPoint = {
  lat: number;
  lon: number;
};

type RunnerSortKey = "name" | "record" | "participation";

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

function formatPoint(point: GpxPoint) {
  return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
}

function convertRecordToSeconds(record: string) {
  const normalized = record
    .trim()
    .toLowerCase()
    .replace("分", ":")
    .replace("분", ":")
    .replace("m", ":")
    .replace("秒", "")
    .replace("초", "")
    .replace("s", "");

  const parts = normalized
    .split(":")
    .map((part) => Number(part))
    .filter((part) => !Number.isNaN(part));

  if (parts.length === 1) return parts[0] * 60;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  return Number.MAX_SAFE_INTEGER;
}

function normalizeParticipationLevel(value: string): ParticipationLevel {
  const normalized = value.trim().toLowerCase();

  if (normalized === "high") return "high";
  if (normalized === "low") return "low";
  return "medium";
}

async function reverseGeocode(point: GpxPoint) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");

  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(point.lat));
  url.searchParams.set("lon", String(point.lon));
  url.searchParams.set("zoom", "16");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");

  try {
    const response = await fetch(url.toString());

    if (!response.ok) return formatPoint(point);

    const data = await response.json();

    return data.name || data.display_name || formatPoint(point);
  } catch {
    return formatPoint(point);
  }
}

export default function Home() {
  const [runners, setRunners] = useState<Runner[]>(initialRunners);
  const [routeSections, setRouteSections] = useState<RouteSection[]>([]);

  const [runnerAssignments, setRunnerAssignments] = useState<
    Record<string, string[]>
  >({});

  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [routeUrls, setRouteUrls] = useState<Record<string, string>>({});
  const [routeInfoBySection, setRouteInfoBySection] = useState<
    Record<string, SectionRouteInfo>
  >({});

  const [isRunnerModalOpen, setIsRunnerModalOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortKey, setSortKey] = useState<RunnerSortKey>("name");

  const [editingRunner, setEditingRunner] = useState<Runner | null>(null);
  const [editEnglishName, setEditEnglishName] = useState("");
  const [editTenKmRecord, setEditTenKmRecord] = useState("");
  const [editParticipationLevel, setEditParticipationLevel] =
    useState<ParticipationLevel>("medium");

  async function loadRunners() {
    const { data, error } = await supabase
      .from("runners")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      alert(`Failed to load runners: ${error.message}`);
      return;
    }

    const loadedRunners: Runner[] = data.map((runner) => ({
      id: runner.id,
      englishName: runner.english_name,
      tenKmRecord: runner.ten_km_record ?? "",
      participationLevel: runner.participation_level,
    }));

    setRunners(loadedRunners);
  }

  async function loadRouteSections() {
    const { data, error } = await supabase
      .from("route_sections")
      .select("*")
      .order("section_order", { ascending: true });

    if (error) {
      alert(`Failed to load route sections: ${error.message}`);
      return;
    }

    const loadedSections: RouteSection[] = data.map((section) => ({
      id: section.id,
      order: section.section_order,
      name: section.section_name,
      startPoint: section.start_point ?? "Not uploaded",
      endPoint: section.end_point ?? "Not uploaded",
      distanceKm: Number(section.distance_km ?? 0),
      elevationGainM: Number(section.elevation_gain_m ?? 0),
      routeUrl: section.route_url ?? "",
    }));

    const loadedRouteUrls: Record<string, string> = {};
    const loadedRouteInfo: Record<string, SectionRouteInfo> = {};

    for (const section of loadedSections) {
      loadedRouteUrls[section.id] = section.routeUrl;
      loadedRouteInfo[section.id] = {
        distanceKm: section.distanceKm,
        elevationDiffM: section.elevationGainM,
        startPoint: section.startPoint,
        endPoint: section.endPoint,
      };
    }

    setRouteSections(loadedSections);
    setRouteUrls(loadedRouteUrls);
    setRouteInfoBySection(loadedRouteInfo);
  }

  async function loadAssignments() {
    const { data, error } = await supabase
      .from("section_runner_assignments")
      .select("*");

    if (error) {
      alert(`Failed to load assignments: ${error.message}`);
      return;
    }

    const loadedAssignments: Record<string, string[]> = {};

    for (const assignment of data) {
      const sectionId = assignment.section_id;
      const runnerId = assignment.runner_id;

      if (!loadedAssignments[sectionId]) {
        loadedAssignments[sectionId] = [];
      }

      loadedAssignments[sectionId].push(runnerId);
    }

    setRunnerAssignments(loadedAssignments);
  }

  useEffect(() => {
    loadRunners();
    loadRouteSections();
    loadAssignments();
  }, []);

  async function handleAddSection() {
    const nextOrder =
      routeSections.length === 0
        ? 1
        : Math.max(...routeSections.map((section) => section.order)) + 1;

    const { data, error } = await supabase
      .from("route_sections")
      .insert({
        section_order: nextOrder,
        section_name: `Section ${nextOrder}`,
        start_point: null,
        end_point: null,
        distance_km: 0,
        elevation_gain_m: 0,
        route_url: null,
      })
      .select()
      .single();

    if (error) {
      alert(`Failed to add section: ${error.message}`);
      return;
    }

    const newSection: RouteSection = {
      id: data.id,
      order: data.section_order,
      name: data.section_name,
      startPoint: data.start_point ?? "Not uploaded",
      endPoint: data.end_point ?? "Not uploaded",
      distanceKm: Number(data.distance_km ?? 0),
      elevationGainM: Number(data.elevation_gain_m ?? 0),
      routeUrl: data.route_url ?? "",
    };

    setRouteSections((currentSections) => [...currentSections, newSection]);
  }

  async function handleDeleteSection(sectionId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this section?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("route_sections")
      .delete()
      .eq("id", sectionId);

    if (error) {
      alert(`Failed to delete section: ${error.message}`);
      return;
    }

    setRouteSections((currentSections) =>
      currentSections.filter((section) => section.id !== sectionId)
    );

    setRunnerAssignments((currentAssignments) => {
      const updated = { ...currentAssignments };
      delete updated[sectionId];
      return updated;
    });

    setRouteUrls((currentRouteUrls) => {
      const updated = { ...currentRouteUrls };
      delete updated[sectionId];
      return updated;
    });

    setRouteInfoBySection((currentInfo) => {
      const updated = { ...currentInfo };
      delete updated[sectionId];
      return updated;
    });
  }

  async function handleRegisterRunner(runner: Runner) {
    if (runners.length >= MAX_RUNNER_COUNT) {
      alert("You can register up to 100 runners.");
      return;
    }

    const { data, error } = await supabase
      .from("runners")
      .insert({
        english_name: runner.englishName,
        ten_km_record: runner.tenKmRecord,
        participation_level: runner.participationLevel,
      })
      .select()
      .single();

    if (error) {
      alert(`Failed to register runner: ${error.message}`);
      return;
    }

    const savedRunner: Runner = {
      id: data.id,
      englishName: data.english_name,
      tenKmRecord: data.ten_km_record ?? "",
      participationLevel: data.participation_level,
    };

    setRunners((currentRunners) => [...currentRunners, savedRunner]);
  }

  async function handleDeleteRunner(runnerId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this runner?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("runners")
      .delete()
      .eq("id", runnerId);

    if (error) {
      alert(`Failed to delete runner: ${error.message}`);
      return;
    }

    setRunners((currentRunners) =>
      currentRunners.filter((runner) => runner.id !== runnerId)
    );

    setRunnerAssignments((currentAssignments) => {
      const updatedAssignments: Record<string, string[]> = {};

      for (const [sectionId, runnerIds] of Object.entries(
        currentAssignments
      )) {
        updatedAssignments[sectionId] = runnerIds.filter(
          (id) => id !== runnerId
        );
      }

      return updatedAssignments;
    });
  }

  function openEditRunnerModal(runner: Runner) {
    setEditingRunner(runner);
    setEditEnglishName(runner.englishName);
    setEditTenKmRecord(runner.tenKmRecord);
    setEditParticipationLevel(runner.participationLevel);
  }

  async function handleUpdateRunner() {
    if (!editingRunner) return;

    const { data, error } = await supabase
      .from("runners")
      .update({
        english_name: editEnglishName,
        ten_km_record: editTenKmRecord,
        participation_level: editParticipationLevel,
      })
      .eq("id", editingRunner.id);

    if (error) {
      alert(`Failed to update runner: ${error.message}`);
      return;
    }

    const updatedRunner: Runner = {
      id: editingRunner.id,
      englishName: editEnglishName,
      tenKmRecord: editTenKmRecord,
      participationLevel: editParticipationLevel,
    };

    setRunners((currentRunners) =>
      currentRunners.map((runner) =>
        runner.id === updatedRunner.id ? updatedRunner : runner
      )
    );

    setEditingRunner(null);
  }

  async function handleCsvImport(file: File | null) {
    if (!file) return;

    const csvText = await file.text();
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const dataLines =
      lines[0]?.toLowerCase().includes("name") ||
        lines[0]?.toLowerCase().includes("english")
        ? lines.slice(1)
        : lines;

    const importedRunners: {
      english_name: string;
      ten_km_record: string;
      participation_level: ParticipationLevel;
    }[] = [];

    for (const line of dataLines) {
      const [englishName, tenKmRecord, participationLevel] = line
        .split(",")
        .map((value) => value.trim());

      if (!englishName) continue;

      importedRunners.push({
        english_name: englishName,
        ten_km_record: tenKmRecord ?? "",
        participation_level: normalizeParticipationLevel(
          participationLevel ?? "medium"
        ),
      });
    }

    if (importedRunners.length === 0) {
      alert("No valid runners found in CSV.");
      return;
    }

    const { data, error } = await supabase
      .from("runners")
      .insert(importedRunners)
      .select();

    if (error) {
      alert(`Failed to import CSV: ${error.message}`);
      return;
    }

    const savedRunners: Runner[] = data.map((runner) => ({
      id: runner.id,
      englishName: runner.english_name,
      tenKmRecord: runner.ten_km_record ?? "",
      participationLevel: runner.participation_level,
    }));

    setRunners((currentRunners) => [...currentRunners, ...savedRunners]);
  }

  async function toggleRunner(sectionId: string, runnerId: string) {
    const currentRunnerIds = runnerAssignments[sectionId] ?? [];
    const isSelected = currentRunnerIds.includes(runnerId);

    if (isSelected) {
      const { error } = await supabase
        .from("section_runner_assignments")
        .delete()
        .eq("section_id", sectionId)
        .eq("runner_id", runnerId);

      if (error) {
        alert(`Failed to remove assignment: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase
        .from("section_runner_assignments")
        .insert({
          section_id: sectionId,
          runner_id: runnerId,
          static_section_id: sectionId,
        });

      if (error) {
        alert(`Failed to add assignment: ${error.message}`);
        return;
      }
    }

    setRunnerAssignments((currentAssignments) => {
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

    if (assignedRunnerIds.length === 0) return "Unassigned";

    return runners
      .filter((runner) => assignedRunnerIds.includes(runner.id))
      .map((runner) => runner.englishName)
      .join(", ");
  }

  function getRunnerAssignedDistance(runnerId: string) {
    let totalDistance = 0;

    for (const section of routeSections) {
      const assignedRunnerIds = runnerAssignments[section.id] ?? [];

      if (!assignedRunnerIds.includes(runnerId)) continue;

      totalDistance += section.distanceKm;
    }

    return totalDistance.toFixed(1);
  }

  function handleRouteUrlChange(sectionId: string, routeUrl: string) {
    setRouteUrls((currentRouteUrls) => ({
      ...currentRouteUrls,
      [sectionId]: routeUrl,
    }));
  }

  async function handleRouteUrlSave(sectionId: string) {
    const routeUrl = routeUrls[sectionId] ?? "";

    const { error } = await supabase
      .from("route_sections")
      .update({
        route_url: routeUrl,
      })
      .eq("id", sectionId);

    if (error) {
      alert(`Failed to save route URL: ${error.message}`);
      return;
    }

    setRouteSections((currentSections) =>
      currentSections.map((section) =>
        section.id === sectionId ? { ...section, routeUrl } : section
      )
    );
  }

  async function handleGpxUpload(sectionId: string, file: File | null) {
    if (!file) return;

    const gpxText = await file.text();
    const gpx = new GPXParser();

    gpx.parse(gpxText);

    const track = gpx.tracks[0];

    if (!track || track.points.length === 0) {
      alert("No track data found in the GPX file.");
      return;
    }

    const startPointRaw = track.points[0];
    const endPointRaw = track.points[track.points.length - 1];

    const distanceKm = Number((track.distance.total / 1000).toFixed(2));
    const elevationGainM = Math.round(track.elevation.pos);

    const [startPoint, endPoint] = await Promise.all([
      reverseGeocode({ lat: startPointRaw.lat, lon: startPointRaw.lon }),
      reverseGeocode({ lat: endPointRaw.lat, lon: endPointRaw.lon }),
    ]);

    const { error } = await supabase
      .from("route_sections")
      .update({
        start_point: startPoint,
        end_point: endPoint,
        distance_km: distanceKm,
        elevation_gain_m: elevationGainM,
      })
      .eq("id", sectionId);

    if (error) {
      alert(`Failed to save GPX info: ${error.message}`);
      return;
    }

    setRouteSections((currentSections) =>
      currentSections.map((section) =>
        section.id === sectionId
          ? {
            ...section,
            startPoint,
            endPoint,
            distanceKm,
            elevationGainM,
          }
          : section
      )
    );

    setRouteInfoBySection((currentRouteInfo) => ({
      ...currentRouteInfo,
      [sectionId]: {
        distanceKm,
        elevationDiffM: elevationGainM,
        startPoint,
        endPoint,
      },
    }));
  }

  const visibleRunners = runners
    .filter((runner) =>
      runner.englishName.toLowerCase().includes(searchKeyword.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === "name") {
        return a.englishName.localeCompare(b.englishName);
      }

      if (sortKey === "record") {
        return (
          convertRecordToSeconds(a.tenKmRecord) -
          convertRecordToSeconds(b.tenKmRecord)
        );
      }

      return a.participationLevel.localeCompare(b.participationLevel);
    });

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-600 sm:text-4xl">
            Relay Route Planner
          </h1>

          <p className="mt-2 text-base text-gray-700 sm:text-lg">
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

      <div className="mt-8 rounded-xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Registered Runners
            </h2>
            <p className="text-sm text-gray-600">
              {runners.length} / {MAX_RUNNER_COUNT}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="rounded border border-gray-300 px-3 py-2"
              placeholder="Search runner"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />

            <select
              className="rounded border border-gray-300 px-3 py-2"
              value={sortKey}
              onChange={(event) =>
                setSortKey(event.target.value as RunnerSortKey)
              }
            >
              <option value="name">Sort by name</option>
              <option value="record">Sort by 10km record</option>
              <option value="participation">Sort by participation</option>
            </select>

            <label className="cursor-pointer rounded bg-gray-700 px-4 py-2 text-center font-semibold text-white">
              CSV Import
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) =>
                  handleCsvImport(event.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {visibleRunners.length === 0 ? (
            <p className="text-gray-500">No runners found.</p>
          ) : (
            visibleRunners.map((runner) => (
              <div
                key={runner.id}
                className="flex flex-col gap-3 rounded border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{runner.englishName}</p>
                  <p className="text-sm text-gray-500">
                    10km: {runner.tenKmRecord || "-"} | Participation:{" "}
                    {runner.participationLevel} | Assigned Distance:{" "}
                    {getRunnerAssignedDistance(runner.id)} km
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded bg-yellow-500 px-3 py-2 text-sm font-semibold text-white"
                    onClick={() => openEditRunnerModal(runner)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                    onClick={() => handleDeleteRunner(runner.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            Route Sections
          </h2>

          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white"
            onClick={handleAddSection}
          >
            Add Section
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1800px] w-full table-fixed border-collapse text-gray-900">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">
                  Section
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  Start Point
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  End Point
                </th>
                <th className="w-36 whitespace-nowrap border border-gray-300 p-2 text-left">
                  Distance (km)
                </th>
                <th className="w-36 whitespace-nowrap border border-gray-300 p-2 text-left">
                  Elevation Gain (m)
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
                  GPX
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  Runner
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {routeSections.map((section) => {
                const distanceKm = section.distanceKm;
                const elevationGainM = section.elevationGainM;

                return (
                  <tr key={section.id}>
                    <td className="border border-gray-300 p-2">
                      {section.name}
                    </td>

                    <td className="border border-gray-300 p-2 text-sm">
                      {section.startPoint}
                    </td>

                    <td className="border border-gray-300 p-2 text-sm">
                      {section.endPoint}
                    </td>

                    <td className="border border-gray-300 p-2 text-center">
                      {distanceKm}
                    </td>

                    <td className="border border-gray-300 p-2 text-center">
                      {elevationGainM}
                    </td>

                    <td className="border border-gray-300 p-2">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${getElevationStyle(
                          elevationGainM
                        )}`}
                      >
                        {getElevationLabel(elevationGainM)}
                      </span>
                    </td>

                    <td className="border border-gray-300 p-2">
                      {calculateDifficulty(distanceKm, elevationGainM)}
                    </td>

                    <td className="border border-gray-300 p-2">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                          placeholder="Paste route URL"
                          value={routeUrls[section.id] ?? ""}
                          onChange={(event) =>
                            handleRouteUrlChange(section.id, event.target.value)
                          }
                          onBlur={() => handleRouteUrlSave(section.id)}
                        />

                        <button
                          type="button"
                          className="whitespace-nowrap rounded bg-gray-700 px-3 py-2 text-sm text-white disabled:bg-gray-300"
                          disabled={!routeUrls[section.id]}
                          onClick={() =>
                            window.open(routeUrls[section.id], "_blank")
                          }
                        >
                          Open
                        </button>
                      </div>
                    </td>

                    <td className="border border-gray-300 p-2">
                      <label className="inline-block cursor-pointer rounded bg-gray-700 px-3 py-2 text-sm font-semibold text-white">
                        Choose File
                        <input
                          type="file"
                          accept=".gpx"
                          className="hidden"
                          onChange={(event) =>
                            handleGpxUpload(
                              section.id,
                              event.target.files?.[0] ?? null
                            )
                          }
                        />
                      </label>
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

                    <td className="border border-gray-300 p-2">
                      <button
                        type="button"
                        className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-white p-4 shadow-md sm:p-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Elevation Gain Profile
        </h2>

        {routeSections.length === 0 ? (
          <p className="mt-4 text-gray-500">No route sections found.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="flex min-w-[900px] items-end gap-2">
              {routeSections.map((section) => {
                const height = Math.max(
                  Math.min(section.elevationGainM, 150),
                  10
                );

                const barColor =
                  section.elevationGainM >= 80
                    ? "bg-red-500"
                    : section.elevationGainM >= 30
                      ? "bg-yellow-500"
                      : "bg-green-500";

                return (
                  <div
                    key={section.id}
                    className="flex flex-1 flex-col items-center"
                  >
                    <div className="mb-2 text-xs text-gray-600">
                      {section.elevationGainM}m
                    </div>

                    <div
                      className={`w-full rounded-t ${barColor}`}
                      style={{
                        height: `${height}px`,
                      }}
                    />

                    <div className="mt-2 text-xs font-medium text-gray-700">
                      {section.order}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <RunnerRegistrationModal
        isOpen={isRunnerModalOpen}
        onClose={() => setIsRunnerModalOpen(false)}
        onRegister={handleRegisterRunner}
      />

      {editingRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-semibold text-gray-900">
              Edit Runner
            </h2>

            <div className="mt-4 space-y-4">
              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={editEnglishName}
                onChange={(event) => setEditEnglishName(event.target.value)}
                placeholder="English Name"
              />

              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={editTenKmRecord}
                onChange={(event) => setEditTenKmRecord(event.target.value)}
                placeholder="10km Record"
              />

              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={editParticipationLevel}
                onChange={(event) =>
                  setEditParticipationLevel(
                    event.target.value as ParticipationLevel
                  )
                }
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded border border-gray-300 px-4 py-2"
                onClick={() => setEditingRunner(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="rounded bg-blue-600 px-4 py-2 text-white"
                onClick={handleUpdateRunner}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}