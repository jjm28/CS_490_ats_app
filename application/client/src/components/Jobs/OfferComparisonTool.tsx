// client/src/components/Jobs/OfferComparisonTool.tsx
import React, { useEffect, useMemo, useState } from "react";


import {
  archiveOffer,
  compareOffers,
  listOffers,
  updateOfferComp,
  saveOfferComparison,
  listOfferComparisons,
  getOfferComparison,
  deleteOfferComparison,
  generateOfferCareerProjection,
  type OfferJob,
  type ComparePayload,
  type CompareResult,
  type SavedOfferComparison,
  type CareerProjectionResult,
  type CareerProjectionInputs,
  type CareerMilestoneInput,
} from "../../api/offers";

type ScenarioByJobId = NonNullable<ComparePayload["scenarioByJobId"]>;
type ScenarioOverrides = ScenarioByJobId[string];
type RatingsByJobId = NonNullable<ComparePayload["ratingsByJobId"]>;
type Ratings = RatingsByJobId[string];

// Keep benefits out of the UI. If a job offer does not specify benefitsValue, we assume this preset.
// (Must match DEFAULT_BENEFITS_VALUE in server/services/offerComparison.service.js)
const DEFAULT_BENEFITS_VALUE = 15000;

function money(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "$0";
  return x.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type WorkMode = "remote" | "hybrid" | "onsite";

function normalizeWorkMode(input: any): WorkMode | undefined {
  if (input == null) return undefined;
  const s = String(input).trim().toLowerCase();
  if (!s) return undefined;

  if (["remote", "wfh", "work from home", "fully remote"].includes(s)) return "remote";
  if (["hybrid", "partial remote", "hybrid remote"].includes(s)) return "hybrid";
  if (["onsite", "on-site", "on site", "in person", "in-person", "office"].includes(s)) return "onsite";

  return undefined;
}

function inferWorkModeFromJob(job: any): WorkMode | undefined {
  // Try the canonical field first, then common variants that may exist in your Jobs collection
  return normalizeWorkMode(
    job?.workMode ??
      job?.workPlaceType ??
      job?.workplaceType ??
      job?.remotePolicy ??
      job?.remote_policy ??
      job?.work_mode
  );
}

function workModeLabel(mode?: WorkMode) {
  if (mode === "remote") return "Remote";
  if (mode === "hybrid") return "Hybrid";
  if (mode === "onsite") return "In person";
  return "No work mode";
}


function pctLabel(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0%";
  return `${x}%`;
}

function isOfferJob(x: OfferJob | null | undefined): x is OfferJob {
  return !!x && typeof (x as any)._id === "string";
}


function SalaryGrowthChart({
  years,
  series,
}: {
  years: number[];
  series: Array<{ label: string; data: number[] }>;
}) {
  const W = 860;
  const H = 280;
  const padL = 52;
  const padR = 18;
  const padT = 18;
  const padB = 42;

  const all = series.flatMap((s) => s.data || []);
  const minV = Math.min(...all, 0);
  const maxV = Math.max(...all, 1);
  const range = maxV - minV || 1;

  const x = (i: number) => {
    const n = Math.max(1, years.length - 1);
    const t = i / n;
    return padL + t * (W - padL - padR);
  };
  const y = (v: number) => {
    const t = (v - minV) / range;
    return H - padB - t * (H - padT - padB);
  };

  const palette = ["#111827", "#2563eb", "#16a34a", "#db2777", "#f97316"];

  return (
    <div className="w-full overflow-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Salary growth chart">
        {/* Axes */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#e5e7eb" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#e5e7eb" />

        {/* Y grid + labels */}
        {Array.from({ length: 5 }).map((_, i) => {
          const t = i / 4;
          const v = minV + (1 - t) * range;
          const yy = y(v);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#f3f4f6" />
              <text x={padL - 8} y={yy + 4} fontSize="10" textAnchor="end" fill="#6b7280">
                {money(v)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {years.map((yr, i) => {
          const xx = x(i);
          return (
            <g key={yr}>
              <line x1={xx} y1={H - padB} x2={xx} y2={H - padB + 4} stroke="#e5e7eb" />
              <text x={xx} y={H - padB + 18} fontSize="10" textAnchor="middle" fill="#6b7280">
                Y{yr}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {series.map((s, si) => {
          const d = (s.data || [])
            .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
            .join(" ");
          const color = palette[si % palette.length];
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={color} strokeWidth={2.5} />
              {s.data.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        {series.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded" style={{ background: palette[i % palette.length] }} />
            <span className="text-gray-700">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OfferComparisonPage() {
  const [offersActive, setOffersActive] = useState<OfferJob[]>([]);
  const [offersArchived, setOffersArchived] = useState<OfferJob[]>([]);
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  const [colIndexByJobId, setColIndexByJobId] = useState<Record<string, number>>({});
  const [scenarioByJobId, setScenarioByJobId] = useState<ScenarioByJobId>({});
  const [ratingsByJobId, setRatingsByJobId] = useState<RatingsByJobId>({});
  const [showSavedModal, setShowSavedModal] = useState(false);
    const [savedComparisons, setSavedComparisons] = useState<SavedOfferComparison[]>([]);
    const [savedLoading, setSavedLoading] = useState(false);

  // --- Career growth (AI) ---
  const [careerInputs, setCareerInputs] = useState<CareerProjectionInputs>({
    raiseScenarios: { conservativePct: 2, expectedPct: 3, optimisticPct: 5 },
    bonusGrowthPct: 0,
    equityGrowthPct: 0,
    benefitsGrowthPct: 0,
    milestones: [],
    careerGoals: "",
    salaryGoals: "",
    nonFinancialGoals: "",
    notes: "",
    startingCompByJobId: {},
  });

  const [careerScenarioKey, setCareerScenarioKey] = useState<"conservative" | "expected" | "optimistic">("expected");
  const [careerProjection, setCareerProjection] = useState<CareerProjectionResult | null>(null);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState<string>("");


  const [weights, setWeights] = useState({
    financialWeight: 0.65,
    cultureFitWeight: 1,
    growthWeight: 1,
    workLifeBalanceWeight: 1,
    remotePolicyWeight: 1,
  });

  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string>("");

  async function reload() {
    setError("");
    const [a, ar] = await Promise.all([listOffers(false), listOffers(true)]);
    setOffersActive(a);
    setOffersArchived(ar);

    // auto-pick first two active offers
    if (!aId && a.length > 0) setAId(a[0]._id);
    if (!bId && a.length > 1) setBId(a[1]._id);
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message || String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => {
    const map = new Map<string, OfferJob>();
    [...offersActive, ...offersArchived].forEach((o) => map.set(o._id, o));
    return {
      a: aId ? map.get(aId) : undefined,
      b: bId ? map.get(bId) : undefined,
    };
  }, [offersActive, offersArchived, aId, bId]);

  const selectedOffers = useMemo<OfferJob[]>(() => [selected.a, selected.b].filter(isOfferJob), [selected.a, selected.b]);


  // seed startingCompByJobId from the currently selected offers (without overwriting user edits)
  useEffect(() => {
    setCareerInputs((prev) => {
      const next = { ...(prev || {}) } as any;
      const map: Record<string, any> = { ...(next.startingCompByJobId || {}) };

      const seedFromOffer = (o?: OfferJob | null) => {
        if (!o?._id) return;
        if (map[o._id]) return;
        map[o._id] = {
          salary: Number(o.finalSalary || 0),
          bonus: Number(o.salaryBonus || 0),
          equity: Number(o.salaryEquity || 0),
          benefits: Number(o.benefitsValue || 0),
        };
      };

      seedFromOffer(selected.a);
      seedFromOffer(selected.b);

      next.startingCompByJobId = map;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.a?._id, selected.b?._id]);


  const canCompare = !!(selected.a && selected.b && selected.a._id !== selected.b._id);
  async function loadSavedComparisons() {
  setSavedLoading(true);
  try {
    const rows = await listOfferComparisons();
    setSavedComparisons(rows);
  } catch (e) {
    console.error(e);
  } finally {
    setSavedLoading(false);
  }
}

// --- Toggle saved modal ---
function toggleSavedModal() {
  const next = !showSavedModal;
  setShowSavedModal(next);
  if (next) loadSavedComparisons();
}

// --- Save a comparison snapshot ---
async function onSaveComparison() {
  if (!result || !selected.a || !selected.b) return;

  const name = window.prompt(
    "Enter a name for this comparison:",
    `${selected.a.company} vs ${selected.b.company}`
  );
  if (!name) return;

  const inputs = {
    jobIds: [selected.a._id, selected.b._id],
    colIndexByJobId,
    scenarioByJobId,
    ratingsByJobId,
    weights,
  };

  await saveOfferComparison({
    name,
    jobIds: inputs.jobIds,
    inputs,   // IMPORTANT: must be `inputs`
    result,
  });

  alert("Comparison saved!");
  loadSavedComparisons();
}

async function onOpenSavedComparison(id: string) {
  const snap = await getOfferComparison(id);
  if (!snap) return alert("Not found");

  // restore selection + inputs + result
  const ids = Array.isArray(snap.jobIds) ? snap.jobIds : [];
  if (ids.length >= 1) setAId(ids[0]);
  if (ids.length >= 2) setBId(ids[1]);

  const inputs = snap.inputs || {};
  setColIndexByJobId(inputs.colIndexByJobId || {});
  setScenarioByJobId(inputs.scenarioByJobId || {});
  setRatingsByJobId(inputs.ratingsByJobId || {});
  if (inputs.weights) setWeights((prev) => ({ ...prev, ...inputs.weights }));

  setResult((snap.result as CompareResult) || null);
  setShowSavedModal(false);
}
// --- Delete a saved comparison ---
async function onDeleteSavedComparison(id: string) {
  if (!window.confirm("Delete this saved comparison?")) return;
  await deleteOfferComparison(id);
  loadSavedComparisons();
}
  function updateStartingComp(jobId: string, patch: any) {
    setCareerInputs((prev) => ({
      ...(prev || {}),
      startingCompByJobId: {
        ...(prev?.startingCompByJobId || {}),
        [jobId]: { ...((prev?.startingCompByJobId || {})[jobId] || {}), ...patch },
      },
    }));
  }

  function addMilestone() {
    const next: CareerMilestoneInput = {
      year: 1,
      title: "",
      salaryBumpPct: 10,
      bonusBumpPct: 0,
      equityBumpPct: 0,
      benefitsBumpPct: 0,
      note: "",
    };
    setCareerInputs((prev) => ({
      ...(prev || {}),
      milestones: [...(prev?.milestones || []), next],
    }));
  }

  function updateMilestone(idx: number, patch: Partial<CareerMilestoneInput>) {
    setCareerInputs((prev) => {
      const ms = [...(prev?.milestones || [])];
      ms[idx] = { ...(ms[idx] || {}), ...patch } as any;
      return { ...(prev || {}), milestones: ms };
    });
  }

  function removeMilestone(idx: number) {
    setCareerInputs((prev) => {
      const ms = [...(prev?.milestones || [])];
      ms.splice(idx, 1);
      return { ...(prev || {}), milestones: ms };
    });
  }

  async function onRunCareerProjection() {
    if (!selected.a || !selected.b) return;
    setCareerError("");
    setCareerLoading(true);
    try {
      const proj = await generateOfferCareerProjection({
        jobIds: [selected.a._id, selected.b._id],
        inputs: careerInputs,
      });
      setCareerProjection(proj);
    } catch (e: any) {
      setCareerError(e?.message || String(e));
    } finally {
      setCareerLoading(false);
    }
  }



  function setRating(jobId: string, patch: Partial<Ratings>) {
    setRatingsByJobId((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] || {}), ...patch },
    }));
  }

  function setScenario(jobId: string, patch: Partial<ScenarioOverrides>) {
    setScenarioByJobId((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] || {}), ...patch },
    }));
  }

  function setCol(jobId: string, value: number) {
    setColIndexByJobId((prev) => ({ ...prev, [jobId]: value }));
  }

  async function onSaveComp(job: OfferJob) {
    setError("");
    try {
      await updateOfferComp(job._id, job);
      await reload();
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function onCompare() {
    if (!canCompare) return;
    setError("");
    setResult(null);
    try {
      const payload: ComparePayload = {
        jobIds: [selected.a!._id, selected.b!._id],
        baselineColIndex: 100,
        colIndexByJobId,
        scenarioByJobId,
        ratingsByJobId,
        weights,
      };
      const r = await compareOffers(payload);
      setResult(r);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function onArchive(jobId: string) {
    const reason = window.prompt("Archive reason (e.g., Declined, Low comp, Culture fit):", "Declined");
    if (!reason) return;
    setError("");
    try {
      await archiveOffer(jobId, reason);
      await reload();
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  function OfferEditor({ offer }: { offer: OfferJob }) {
    const jobId = offer._id;
    const ratings: Ratings = (ratingsByJobId[jobId] || {
      cultureFit: 3,
      growth: 3,
      workLifeBalance: 3,
      remotePolicy: 3,
    }) as Ratings;

    const scenario: ScenarioOverrides = (scenarioByJobId[jobId] || {
      salaryIncreasePct: 0,
      bonusIncreasePct: 0,
      equityIncreasePct: 0,
      benefitsIncreasePct: 0,
    }) as ScenarioOverrides;
    const col = colIndexByJobId[jobId] ?? 100;

    // local editable copy
    const [draft, setDraft] = useState<OfferJob>(offer);

    useEffect(() => {
        const inferred = inferWorkModeFromJob(offer);
        setDraft({ ...offer, workMode: inferred ?? (offer as any).workMode } as any);
        }, [offer._id]);

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{offer.company} — {offer.jobTitle}</div>
            <div className="text-sm text-gray-600">
                {offer.location || "No location"} • {workModeLabel(inferWorkModeFromJob(offer))}
                </div>
          </div>

          <button
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            onClick={() => onArchive(jobId)}
          >
            Archive
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Base salary
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              type="number"
              value={Number(draft.finalSalary || 0)}
              onChange={(e) => setDraft((p) => ({ ...p, finalSalary: Number(e.target.value) }))}
            />
          </label>

          <label className="text-sm">
            Bonus
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              type="number"
              value={Number(draft.salaryBonus || 0)}
              onChange={(e) => setDraft((p) => ({ ...p, salaryBonus: Number(e.target.value) }))}
            />
          </label>

          <label className="text-sm">
            Equity (annualized)
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              type="number"
              value={Number(draft.salaryEquity || 0)}
              onChange={(e) => setDraft((p) => ({ ...p, salaryEquity: Number(e.target.value) }))}
            />
          </label>

          <div className="text-sm">
            <div className="font-medium">Benefits (estimated)</div>
            <label className="text-sm">
                Benefits (estimated)
                <input
                    className="mt-1 w-full rounded border border-gray-300 p-2"
                    type="number"
                    value={Number(offer.benefitsValue || 0)}
                     onChange={(e) => setDraft((p) => ({ ...p, benefitsValue: Number(e.target.value) }))}
                />
                </label>
          </div>

          <label className="text-sm">
            Location
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              value={draft.location || ""}
              onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
            />
          </label>

          <label className="text-sm">
                Remote policy
                <select
                    className="mt-1 w-full rounded border border-gray-300 p-2"
                    value={(draft.workMode || (draft as any).workPlaceType || "In person") as any}
                    onChange={(e) =>
                    setDraft((p) => ({
                        ...p,
                        workMode: e.target.value,
                        workPlaceType: e.target.value, // keep both in sync if your job model uses this name
                    } as any))
                    }
                >
                    <option value="In person">In person</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                </select>
                </label>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:opacity-90"
            onClick={() => onSaveComp(draft)}
          >
            Save comp
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Cost of Living (100 = Baseline)
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              type="number"
              value={Number(col)}
              onChange={(e) => setCol(jobId, Number(e.target.value))}
            />
          </label>

          <label className="text-sm">
            Scenario: negotiate salary +%
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              type="number"
              value={Number(scenario.salaryIncreasePct || 0)}
              onChange={(e) => setScenario(jobId, { salaryIncreasePct: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Culture fit (1-5)
            <input
              className="mt-1 w-full"
              type="range"
              min={1}
              max={5}
              value={Number(ratings.cultureFit || 3)}
              onChange={(e) => setRating(jobId, { cultureFit: Number(e.target.value) })}
            />
          </label>

          <label className="text-sm">
            Growth (1-5)
            <input
              className="mt-1 w-full"
              type="range"
              min={1}
              max={5}
              value={Number(ratings.growth || 3)}
              onChange={(e) => setRating(jobId, { growth: Number(e.target.value) })}
            />
          </label>

          <label className="text-sm">
            Work-life balance (1-5)
            <input
              className="mt-1 w-full"
              type="range"
              min={1}
              max={5}
              value={Number(ratings.workLifeBalance || 3)}
              onChange={(e) => setRating(jobId, { workLifeBalance: Number(e.target.value) })}
            />
          </label>

          <label className="text-sm">
            Remote policy preference (1-5)
            <input
              className="mt-1 w-full"
              type="range"
              min={1}
              max={5}
              value={Number(ratings.remotePolicy || 3)}
              onChange={(e) => setRating(jobId, { remotePolicy: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Offer Evaluation & Comparison</h1>
        <p className="text-sm text-gray-600">
          This compares your existing job-board entries where <code>status = "offer"</code>.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            Offer A
            <select className="mt-1 w-full rounded border border-gray-300 p-2" value={aId} onChange={(e) => setAId(e.target.value)}>
              {offersActive.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.company} — {o.jobTitle}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Offer B
            <select className="mt-1 w-full rounded border border-gray-300 p-2" value={bId} onChange={(e) => setBId(e.target.value)}>
              {offersActive.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.company} — {o.jobTitle}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm">
            <div className="font-medium">Weights</div>
            <label className="mt-2 block">
              Financial weight (0-1)
              <input
                className="mt-1 w-full rounded border border-gray-300 p-2"
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={weights.financialWeight}
                onChange={(e) => setWeights((p) => ({ ...p, financialWeight: Number(e.target.value) }))}
              />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-40"
            disabled={!canCompare}
            onClick={onCompare}
          >
            Compare
          </button>
        </div>

        <div className="mt-4 flex gap-3">

            {result && (
                <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                onClick={onSaveComparison}
                >
                Save Comparison
                </button>
            )}

            <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                onClick={toggleSavedModal}
            >
                View Past Comparisons
            </button>
            </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {selected.a ? <OfferEditor offer={selected.a} /> : <div className="text-sm text-gray-600">No Offer A selected.</div>}
        {selected.b ? <OfferEditor offer={selected.b} /> : <div className="text-sm text-gray-600">No Offer B selected.</div>}
      </div>

      {result && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Side-by-side comparison</h2>

          <div className="mt-3 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Metric</th>
                  {result.offers.map((o) => (
                    <th key={o.jobId} className="p-2 text-left">
                      {o.company}<div className="text-xs text-gray-500">{o.jobTitle}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.matrixRows.map((row) => (
                  <tr key={row.key} className="border-b">
                    <td className="p-2 font-medium">{row.label}</td>
                    {result.offers.map((o) => {
                      const v: any = (o as any)[row.key];
                      const isMoney = ["salary", "bonus", "equity", "benefits", "totalComp", "colAdjustedTotal"].includes(row.key);
                      return <td key={o.jobId + row.key} className="p-2">{isMoney ? money(v) : String(Math.round(Number(v) || 0))}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-5 text-base font-semibold">Negotiation recommendations</h3>
          <div className="mt-2 grid grid-cols-2 gap-4">
            {result.offers.map((o) => (
              <div key={o.jobId} className="rounded border border-gray-200 p-3">
                <div className="font-medium">{o.company} — {o.jobTitle}</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                  {o.negotiationRecommendations.map((r, idx) => <li key={idx}>{r}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {/* ===== Career Growth Projection (AI) ===== */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Career Growth Projection (AI)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Use AI to estimate salary and total compensation growth over 5 and 10 years (with raise scenarios and milestones).
            </p>
          </div>

          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-40"
            disabled={!selected.a || !selected.b || careerLoading}
            onClick={onRunCareerProjection}
          >
            {careerLoading ? "Running..." : "Run AI projection"}
          </button>
        </div>

        {careerError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {careerError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4">
          {/* Inputs */}
          <div className="rounded border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-800">Raise scenarios (annual %)</div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <label>
                Conservative
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  type="number"
                  value={Number(careerInputs?.raiseScenarios?.conservativePct ?? 0)}
                  onChange={(e) =>
                    setCareerInputs((p) => ({
                      ...(p || {}),
                      raiseScenarios: { ...(p?.raiseScenarios || {}), conservativePct: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              <label>
                Expected
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  type="number"
                  value={Number(careerInputs?.raiseScenarios?.expectedPct ?? 0)}
                  onChange={(e) =>
                    setCareerInputs((p) => ({
                      ...(p || {}),
                      raiseScenarios: { ...(p?.raiseScenarios || {}), expectedPct: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              <label>
                Optimistic
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  type="number"
                  value={Number(careerInputs?.raiseScenarios?.optimisticPct ?? 0)}
                  onChange={(e) =>
                    setCareerInputs((p) => ({
                      ...(p || {}),
                      raiseScenarios: { ...(p?.raiseScenarios || {}), optimisticPct: Number(e.target.value) },
                    }))
                  }
                />
              </label>
            </div>

            <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
              <div className="font-semibold text-gray-900">Projection assumptions (hidden inputs)</div>
              <ul className="mt-1 list-disc pl-5">
                <li>Base salary grows by the selected annual raise scenario.</li>
                <li>Bonus and equity are included from your offer amounts and are assumed <span className="font-medium">flat (0% annual growth)</span> unless changed by milestones.</li>
                <li>Benefits are included as <span className="font-medium">${DEFAULT_BENEFITS_VALUE.toLocaleString()}/year</span> if not provided and are assumed flat.</li>
              </ul>
            </div>

            <div className="mt-5 text-sm font-medium text-gray-800">Starting salary overrides</div>
            <p className="mt-1 text-xs text-gray-500">
              Defaults to the Offer A/B salary inputs above. Use this only if you want the projection to start from a different base salary.
            </p>

            <div className="mt-3 space-y-3 text-sm">
              {selectedOffers.map((o) => {
                const jobId = o._id;
                const sc = (careerInputs?.startingCompByJobId || {})[jobId] || {};
                return (
                  <div key={jobId} className="rounded border border-gray-100 p-2">
                    <div className="font-medium">{o.company} — {o.jobTitle}</div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <label className="text-xs">
                        Salary
                        <input
                          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                          type="number"
                          value={Number(sc.salary ?? 0)}
                          onChange={(e) => updateStartingComp(jobId, { salary: Number(e.target.value) })}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm font-medium text-gray-800">Career milestones (promotions / title changes)</div>
              <button className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50" onClick={addMilestone}>
                + Add milestone
              </button>
            </div>

            {(careerInputs?.milestones || []).length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">No milestones added yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {(careerInputs?.milestones || []).map((m, idx) => (
                  <div key={idx} className="rounded border border-gray-100 p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Milestone {idx + 1}</div>
                      <button className="text-sm text-red-600 hover:underline" onClick={() => removeMilestone(idx)}>
                        Remove
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <label>
                        Year
                        <input
                          className="mt-1 w-full rounded border border-gray-300 p-2"
                          type="number"
                          min={1}
                          max={10}
                          value={Number(m.year ?? 1)}
                          onChange={(e) => updateMilestone(idx, { year: Number(e.target.value) })}
                        />
                      </label>
                      <label className="col-span-2">
                        New title
                        <input
                          className="mt-1 w-full rounded border border-gray-300 p-2"
                          value={m.title || ""}
                          onChange={(e) => updateMilestone(idx, { title: e.target.value })}
                        />
                      </label>
                      <label>
                        Salary bump %
                        <input
                          className="mt-1 w-full rounded border border-gray-300 p-2"
                          type="number"
                          value={Number(m.salaryBumpPct ?? 0)}
                          onChange={(e) => updateMilestone(idx, { salaryBumpPct: Number(e.target.value) })}
                        />
                      </label>
                    </div>

                    <label className="mt-2 block text-sm">
                      Notes
                      <input
                        className="mt-1 w-full rounded border border-gray-300 p-2"
                        value={m.note || ""}
                        onChange={(e) => updateMilestone(idx, { note: e.target.value })}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 text-sm font-medium text-gray-800">Goals & notes (guide the AI)</div>
            <label className="mt-2 block text-sm">
              Career goals (non-financial)
              <textarea
                className="mt-1 w-full rounded border border-gray-300 p-2"
                rows={3}
                value={careerInputs?.careerGoals || ""}
                onChange={(e) => setCareerInputs((p) => ({ ...(p || {}), careerGoals: e.target.value }))}
              />
            </label>

            <label className="mt-3 block text-sm">
              Salary / comp goals (e.g., “$200k TC by year 5”)
              <textarea
                className="mt-1 w-full rounded border border-gray-300 p-2"
                rows={2}
                value={careerInputs?.salaryGoals || ""}
                onChange={(e) => setCareerInputs((p) => ({ ...(p || {}), salaryGoals: e.target.value }))}
              />
            </label>

            <label className="mt-3 block text-sm">
              Notes (location constraints, learning priorities, leadership, etc.)
              <textarea
                className="mt-1 w-full rounded border border-gray-300 p-2"
                rows={2}
                value={careerInputs?.notes || ""}
                onChange={(e) => setCareerInputs((p) => ({ ...(p || {}), notes: e.target.value }))}
              />
            </label>
          </div>

          {/* Outputs */}
          <div className="rounded border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-800">Outputs</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Scenario:</span>
                <select
                  className="rounded border border-gray-300 p-2"
                  value={careerScenarioKey}
                  onChange={(e) => setCareerScenarioKey(e.target.value as any)}
                >
                  <option value="conservative">Conservative</option>
                  <option value="expected">Expected</option>
                  <option value="optimistic">Optimistic</option>
                </select>
              </div>
            </div>

            {!careerProjection ? (
              <p className="mt-3 text-sm text-gray-600">
                Run the AI projection to see 5-year and 10-year salary / total comp trajectories and a chart comparing the offers.
              </p>
            ) : (
              <>
                <div className="mt-3 text-sm text-gray-700">
                  <div className="font-medium text-gray-900">Assumptions</div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div>Conservative raise: <span className="font-medium">{pctLabel((careerProjection as any)?.assumptions?.conservativeAnnualRaisePct ?? careerInputs.raiseScenarios?.conservativePct)}</span></div>
                    <div>Expected raise: <span className="font-medium">{pctLabel((careerProjection as any)?.assumptions?.expectedAnnualRaisePct ?? careerInputs.raiseScenarios?.expectedPct)}</span></div>
                    <div>Optimistic raise: <span className="font-medium">{pctLabel((careerProjection as any)?.assumptions?.optimisticAnnualRaisePct ?? careerInputs.raiseScenarios?.optimisticPct)}</span></div>
                    <div className="col-span-2 text-xs text-gray-500">
                      Bonus/equity are included from offer amounts and assumed flat (0% growth). Benefits use ${DEFAULT_BENEFITS_VALUE.toLocaleString()}/year if not provided.
                    </div>
                  </div>
                  {(careerProjection as any)?.assumptions?.rationale ? (
                    <div className="mt-2 text-xs text-gray-500">{(careerProjection as any).assumptions.rationale}</div>
                  ) : null}
                </div>

                <div className="mt-5">
                  {(() => {
                    const jobs = (careerProjection.jobs || []) as any[];
                    const years = jobs?.[0]?.scenarios?.find((s: any) => s.key === careerScenarioKey)?.fiveYear?.years || [0, 1, 2, 3, 4, 5];
                    const series = jobs.map((j) => {
                      const sc =
                        j.scenarios?.find((s: any) => s.key === careerScenarioKey) ||
                        j.scenarios?.[0];
                      return {
                        label: `${j.company || "Offer"} — ${j.jobTitle || ""}`.trim(),
                        data: sc?.fiveYear?.salary || [],
                      };
                    });
                    return <SalaryGrowthChart years={years} series={series} />;
                  })()}
                </div>

                <div className="mt-5 overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left">Offer</th>
                        <th className="p-2 text-left">5-year ending salary</th>
                        <th className="p-2 text-left">5-year ending total comp</th>
                        <th className="p-2 text-left">10-year ending salary</th>
                        <th className="p-2 text-left">10-year ending total comp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(careerProjection.jobs || []).map((j) => {
                        const sc =
                          j.scenarios?.find((s: any) => s.key === careerScenarioKey) ||
                          j.scenarios?.[0];
                        return (
                          <tr key={j.jobId} className="border-b">
                            <td className="p-2 font-medium">
                              {j.company}
                              <div className="text-xs text-gray-500">{j.jobTitle}</div>
                            </td>
                            <td className="p-2">{money(sc?.fiveYearEndingSalary)}</td>
                            <td className="p-2">{money(sc?.fiveYearEndingTotalComp)}</td>
                            <td className="p-2">{money(sc?.tenYearEndingSalary)}</td>
                            <td className="p-2">{money(sc?.tenYearEndingTotalComp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {careerProjection.analysisSummary ? (
                  <div className="mt-5 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                    <div className="font-medium">AI summary</div>
                    <div className="mt-1">{careerProjection.analysisSummary}</div>
                  </div>
                ) : null}

                {(careerProjection as any)?.recommendation?.narrative ? (
                  <div className="mt-3 rounded border border-gray-200 p-3 text-sm text-gray-800">
                    <div className="font-medium">Recommendation</div>
                    <div className="mt-1">{(careerProjection as any).recommendation.narrative}</div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

<div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Archived / declined offers</h2>
        {offersArchived.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">None archived yet.</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Company</th>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {offersArchived.map((o) => (
                  <tr key={o._id} className="border-b">
                    <td className="p-2">{o.company}</td>
                    <td className="p-2">{o.jobTitle}</td>
                    <td className="p-2">{o.archiveReason || "Declined"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showSavedModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-4 max-w-lg w-full">
                <h2 className="text-lg font-semibold mb-3">Saved Comparisons</h2>
                {savedComparisons.length === 0 ? (
                    <p className="text-sm text-gray-600">No saved comparisons yet.</p>
                ) : (
                    <ul className="divide-y">
                    {savedComparisons.map((s) => (
                        <li key={s._id} className="py-2 flex justify-between items-center">
                        <div>
                            <div className="font-medium">{s.name || "(untitled)"}</div>
                            <div className="text-xs text-gray-500">
                            
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                            onClick={() => onOpenSavedComparison(s._id)}
                            className="text-blue-600 text-sm"
                            >
                            View
                            </button>
                            <button
                            onClick={() => onDeleteSavedComparison(s._id)}
                            className="text-red-600 text-sm"
                            >
                            Delete
                            </button>
                        </div>
                        </li>
                    ))}
                    </ul>
                )}
                <div className="mt-4 text-right">
                    <button
                    onClick={() => setShowSavedModal(false)}
                    className="text-sm text-gray-600 hover:underline"
                    >
                    Close
                    </button>
                </div>
                </div>
            </div>
            )}
    </div>
  );
}
