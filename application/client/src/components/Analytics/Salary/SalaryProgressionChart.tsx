// client/src/components/Analytics/Salary/SalaryProgressionChart.tsx

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { format } from "date-fns";

interface SalaryHistoryPoint {
  date: string;
  finalSalary: number;
  negotiationOutcome: string;
}

interface Props {
  history: SalaryHistoryPoint[];
  jobTitle: string;
  company: string;
}

/**
 * Universal dot renderer — works on ALL Recharts v2 versions.
 * Recharts passes `props: any` here, so we avoid the broken type imports.
 */
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;

  if (cx == null || cy == null || !payload) return null;

  // Map negotiation outcome → dot color
  const colorMap: Record<string, string> = {
    Improved: "green",
    "No change": "orange",
    Worse: "red",
    "Not attempted": "gray",
    "Lost offer": "black",
  };

  const outcome = payload.negotiationOutcome ?? "Not attempted";
  const color = colorMap[outcome] || "gray";

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      stroke="black"
      strokeWidth={1}
    />
  );
};

export default function SalaryProgressionChart({ history, jobTitle, company }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="p-4 text-gray-600">
        No salary negotiation history yet.
      </div>
    );
  }

  // Sort chronologically (oldest → newest)
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="w-full h-80 bg-white border rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">
        Salary Progression — {jobTitle} @ {company}
      </h2>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sorted} margin={{ top: 20, right: 40, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(new Date(d), "MM/dd")}
            minTickGap={20}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            width={80}
          />
          <Tooltip
            formatter={(value: any) => `$${value.toLocaleString()}`}
            labelFormatter={(label) =>
              `Date: ${format(new Date(label), "MMM dd, yyyy")}`
            }
          />

          {/* 🚀 Main salary line */}
          <Line
            type="monotone"
            dataKey="finalSalary"
            stroke="#2563eb"
            strokeWidth={3}
            dot={<CustomDot />}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-500 mt-2">
        Dot colors: Green = Improved · Orange = No Change · Red = Worse · Gray = Not Attempted
      </p>
    </div>
  );
}