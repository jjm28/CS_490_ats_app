// src/components/Resume/ValidationPanel.tsx
import React from "react";
import type { ValidationSummary } from "./ResumeEditorBackup";

type Props = {
  validation: ValidationSummary | null;
  lastValidatedAt: string | null;
  onRunChecks: () => void;
};

export function ValidationPanel({
  validation,
  lastValidatedAt,
  onRunChecks,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded border p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-medium text-sm">Resume Quality Check</h3>
            {lastValidatedAt && (
              <div className="text-[10px] text-gray-500">
                Last checked {new Date(lastValidatedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRunChecks}
            className="text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Run Checks
          </button>
        </div>

        {validation ? (
          <>
            <div className="flex flex-wrap gap-2 text-[11px] mb-3">
              <span className="px-2 py-1 rounded-full bg-white border text-gray-700">
                Words: <strong>{validation.wordCount}</strong>
              </span>
              <span className="px-2 py-1 rounded-full bg-white border text-gray-700">
                Est. length:{" "}
                <strong>
                  {validation.estimatedPages} page
                  {validation.estimatedPages !== 1 ? "s" : ""}
                </strong>
              </span>
              <span className="px-2 py-1 rounded-full bg-white border text-gray-700">
                Tone:{" "}
                <strong className="capitalize">{validation.tone}</strong>
              </span>
              <span
                className={`px-2 py-1 rounded-full border ${
                  validation.contactOk
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {validation.contactOk
                  ? "Contact info looks OK"
                  : "Contact issues detected"}
              </span>
            </div>

            {validation.issues.length === 0 ? (
              <p className="text-xs text-emerald-700">
                ✅ No major issues detected. Still consider a manual review for
                nuance and style.
              </p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-auto text-xs">
                {validation.issues.map((issue, idx) => {
                  const colorClass =
                    issue.severity === "error"
                      ? "text-red-700"
                      : issue.severity === "warning"
                      ? "text-amber-700"
                      : "text-gray-700";
                  const badgeClass =
                    issue.type === "missing-info"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : issue.type === "length"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : issue.type === "contact"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : issue.type === "tone"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-gray-50 text-gray-700 border-gray-200";

                  return (
                    <li key={idx} className={`flex gap-2 ${colorClass}`}>
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${badgeClass}`}
                      >
                        {issue.type.replace("-", " ")}
                      </span>
                      <span>{issue.message}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-2 text-[10px] text-gray-500">
              Note: These checks are heuristic and don’t replace a full
              spell/grammar tool, but they help catch common issues before you
              submit.
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-600">
            Click <span className="font-semibold">Run Checks</span> to analyze
            your resume for length, missing info, contact issues, and tone.
          </p>
        )}
      </div>
    </div>
  );
}
