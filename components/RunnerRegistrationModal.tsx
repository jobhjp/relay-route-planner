import { useState } from "react";
import type { ParticipationLevel, Runner } from "../types/runner";

type RunnerRegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (runner: Runner) => void;
};

export default function RunnerRegistrationModal({
  isOpen,
  onClose,
  onRegister,
}: RunnerRegistrationModalProps) {
  const [englishName, setEnglishName] = useState("");
  const [tenKmRecord, setTenKmRecord] = useState("");
  const [participationLevel, setParticipationLevel] =
    useState<ParticipationLevel>("medium");

  if (!isOpen) {
    return null;
  }

  function handleSubmit() {
    if (!englishName.trim()) {
      alert("Please enter the runner name.");
      return;
    }

    const newRunner: Runner = {
      id: `runner-${Date.now()}`,
      englishName,
      tenKmRecord,
      participationLevel,
    };

    onRegister(newRunner);

    setEnglishName("");
    setTenKmRecord("");
    setParticipationLevel("medium");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-semibold text-gray-900">
          Register Runner
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              English Name
            </label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={englishName}
              onChange={(event) => setEnglishName(event.target.value)}
              placeholder="Example: Byunghyun Cho"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              10km Record
            </label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={tenKmRecord}
              onChange={(event) => setTenKmRecord(event.target.value)}
              placeholder="Example: 45:30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Participation Level
            </label>
            <select
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={participationLevel}
              onChange={(event) =>
                setParticipationLevel(
                  event.target.value as ParticipationLevel
                )
              }
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={handleSubmit}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}