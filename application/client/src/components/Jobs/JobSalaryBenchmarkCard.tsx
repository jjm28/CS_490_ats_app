// src/components/Jobs/JobSalaryBenchmarkCard.tsx
import React, { useEffect, useState } from "react";
import type { Job } from "../../types/jobs.types";
import {
  fetchSalaryBenchmark,
  type SalaryBenchmark,
} from "../../api/salary";

import "./JobSalaryBenchmarkCard.css";

interface JobSalaryBenchmarkCardProps {
  job: Job;
}

export default function JobSalaryBenchmarkCard({
  job,
}: JobSalaryBenchmarkCardProps) {
  const [data, setData] = useState<SalaryBenchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title =
    (job as any).title ||
    (job as any).positionTitle ||
    (job as any).jobTitle ||
    "";
  const location =
    (job as any).location ||
    (job as any).cityState ||
    (job as any).jobLocation ||
    "";

  const jobId = (job as any)._id as string | undefined;

  useEffect(() => {
    if (!title) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchSalaryBenchmark({
          title,
          location,
          jobId,
        });

          if (!cancelled) setData(result);
      } catch (err) {
        console.error("Error loading salary benchmark:", err);
        if (!cancelled) {
          setError("Unable to load salary benchmark right now.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [title, location, jobId]);

  if (!title) return null;

  const showBar = canShowBar(data);

  return (
    <section className="salary-card">
      {/* Header */}
      <header className="salary-card__header">
        <div>
          <h3 className="salary-card__title">Salary benchmark</h3>
          {data && (
            <p className="salary-card__subtitle">
              {data.title || title}
              {data.location || location
                ? ` · ${data.location || location}`
                : " · United States (national)"}
            </p>
          )}
        </div>

        {data?.wageYear && (
          <span className="salary-card__year">
            Wage year {data.wageYear}
          </span>
        )}
      </header>

      {/* States */}
      {loading && (
        <div className="salary-card__state">
          <div className="salary-card__skeleton" />
          <p className="salary-card__state-text">Loading salary data…</p>
        </div>
      )}

      {!loading && error && (
        <div className="salary-card__state salary-card__state--error">
          <p className="salary-card__state-text">{error}</p>
        </div>
      )}

      {!loading && !error && data && !data.hasData && (
        <div className="salary-card__state">
          <p className="salary-card__state-text">
            We couldn&apos;t find reliable salary data for this
            role/location.
          </p>
        </div>
      )}

      {/* Main content */}
      {!loading && !error && data && data.hasData && (
        <>
          {/* Range */}
          <section className="salary-card__range">
            <span className="salary-card__range-label">Estimated range</span>
            <span className="salary-card__range-value">
              {formatMoney(data.min, data.currency)} –{" "}
              {formatMoney(data.max, data.currency)} /{" "}
              {data.period === "year" ? "year" : data.period}
            </span>
          </section>

          {/* Bar with aligned markers + values */}
          {showBar && (
            <section className="salary-card__bar-section">
              <div className="salary-card__bar">
                {data.p25 != null && (
                  <Marker
                    label="25th"
                    valueLabel={formatMoney(data.p25, data.currency)}
                    value={data.p25}
                    min={data.min}
                    max={data.max}
                  />
                )}
                {data.p50 != null && (
                  <Marker
                    label="50th"
                    valueLabel={formatMoney(data.p50, data.currency)}
                    value={data.p50}
                    min={data.min}
                    max={data.max}
                  />
                )}
                {data.p75 != null && (
                  <Marker
                    label="75th"
                    valueLabel={formatMoney(data.p75, data.currency)}
                    value={data.p75}
                    min={data.min}
                    max={data.max}
                  />
                )}
              </div>
            </section>
          )}

          {/* Percentiles list */}
          <section className="salary-card__percentiles">
            {data.p25 != null && (
              <div className="salary-card__percentile-row">
                <span>25th percentile</span>
                <span>{formatMoney(data.p25, data.currency)}</span>
              </div>
            )}
            {data.p50 != null && (
              <div className="salary-card__percentile-row">
                <span>Median (50th)</span>
                <span>{formatMoney(data.p50, data.currency)}</span>
              </div>
            )}
            {data.p75 != null && (
              <div className="salary-card__percentile-row">
                <span>75th percentile</span>
                <span>{formatMoney(data.p75, data.currency)}</span>
              </div>
            )}
          </section>

          {/* Meta */}
          <footer className="salary-card__meta">
            <p>
              Data source: U.S. Bureau of Labor Statistics Occupational
              Employment and Wage Statistics (OEWS), accessed via the U.S.
              Department of Labor&apos;s CareerOneStop API
              {data.wageYear ? ` (wage year ${data.wageYear})` : ""}.
            </p>
            <p>
              These figures are statistical estimates for typical wages and do
              not represent a specific offer. Actual compensation can vary
              based on company, level, location, benefits, and experience.
            </p>
          </footer>
        </>
      )}
    </section>
  );
}

/* helpers */

function formatMoney(value: number | null, currency: string): string {
  if (value == null) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

function canShowBar(data: SalaryBenchmark | null): boolean {
  if (!data) return false;
  if (data.min == null || data.max == null) return false;
  if (data.max <= data.min) return false;
  return data.p25 != null || data.p50 != null || data.p75 != null;
}

interface MarkerProps {
  label: string;
  valueLabel: string;
  value: number;
  min: number | null;
  max: number | null;
}

function Marker({ label, valueLabel, value, min, max }: MarkerProps) {
  if (min == null || max == null || max <= min) return null;
  const ratio = (value - min) / (max - min);
  const clamped = Math.min(1, Math.max(0, ratio));
  const left = `${clamped * 100}%`;

  return (
    <div className="salary-card__marker" style={{ left }}>
      <div className="salary-card__marker-label">{label}</div>
      <div className="salary-card__marker-dot" />
      <div className="salary-card__marker-value">{valueLabel}</div>
    </div>
  );
}

