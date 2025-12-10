// client/src/components/Analytics/Comp/CompProgressionChart.tsx

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

interface CompHistoryPoint {
  date: string;
  totalComp: number;
}

interface Props {
  history: CompHistoryPoint[];
  jobTitle: string;
  company: string;
}

export default function CompProgressionChart({
  history,
  jobTitle,
  company,
}: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="p-4 text-gray-600">
        No total compensation history yet.
      </div>
    );
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="w-full h-80 bg-white border rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">
        Total Compensation Progression — {jobTitle} @ {company}
      </h2>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={sorted}
          margin={{ top: 20, right: 40, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(new Date(d), "MM/dd")}
            minTickGap={20}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            width={100}
          />
          <Tooltip
            formatter={(value: any) => `$${value.toLocaleString()}`}
            labelFormatter={(label) =>
              `Date: ${format(new Date(label), "MMM dd, yyyy")}`
            }
          />
          <Line
            type="monotone"
            dataKey="totalComp"
            stroke="#16a34a"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-500 mt-2">
        Total compensation includes base salary, bonus, equity, and estimated
        benefits.
      </p>
    </div>
  );
}