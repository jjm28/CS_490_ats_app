// application/client/src/components/Job_Tools/SalaryComponents.tsx
import React from "react";

/* =============================
   Shared Interfaces
   ============================= */

export interface SalaryData {
  min: number;
  max: number;
  average: number;
  breakdown: Record<string, number>;
  historicalData?: { year: number; salary: number }[];
  [key: string]: any;
}

export interface JobOpportunity {
  _id?: string;
  jobTitle: string;
  company: string;
  location?: string;
  userExpectedSalary?: number;
}

/* =============================
   Component Prop Interfaces
   ============================= */

export interface SalaryRangeSectionProps {
  data: SalaryData;
}

export interface CompensationBreakdownProps {
  data: SalaryData;
}

export interface CompanyComparisonProps {
  targetCompany?: string;
  data: SalaryData;
}

export interface TrendChartProps {
  data?: { year: number; salary: number }[];
}

export interface YourPositionAnalysisProps {
  yourSalary: number;
  marketData: SalaryData;
}

export interface NegotiationRecommendationsProps {
  jobOpportunity: JobOpportunity;
  salaryData: SalaryData;
}

export interface ExportReportProps {
  jobOpportunity: JobOpportunity;
  salaryData: SalaryData;
}

/* =============================
   Components
   ============================= */

export const SalaryRangeSection: React.FC<SalaryRangeSectionProps> = ({ data }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Salary Range</h2>
    <p>
      ${data.min.toLocaleString()} – ${data.max.toLocaleString()} (avg ${data.average.toLocaleString()})
    </p>
  </div>
);

export const CompensationBreakdown: React.FC<CompensationBreakdownProps> = ({ data }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Compensation Breakdown</h2>
    <pre>{JSON.stringify(data.breakdown, null, 2)}</pre>
  </div>
);

export const CompanyComparison: React.FC<CompanyComparisonProps> = ({ targetCompany, data }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Company Comparison</h2>
    <p>Comparing {targetCompany ?? "selected company"} with market averages</p>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Historical Salary Trends</h2>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export const YourPositionAnalysis: React.FC<YourPositionAnalysisProps> = ({ yourSalary, marketData }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Your Position Analysis</h2>
    <p>
      Your salary: ${yourSalary.toLocaleString()} <br />
      Market average: ${marketData.average.toLocaleString()}
    </p>
  </div>
);

export const NegotiationRecommendations: React.FC<NegotiationRecommendationsProps> = ({
  jobOpportunity,
  salaryData,
}) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Negotiation Recommendations</h2>
    <p>
      Based on market data for {jobOpportunity.jobTitle} at {jobOpportunity.company}.
    </p>
    <p>Market average: ${salaryData.average.toLocaleString()}</p>
  </div>
);

export const ExportReport: React.FC<ExportReportProps> = ({ jobOpportunity, salaryData }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Export Report</h2>
    <button
      onClick={() => console.log("Download salary report", { jobOpportunity, salaryData })}
      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
    >
      Download Salary Report
    </button>
  </div>
);
