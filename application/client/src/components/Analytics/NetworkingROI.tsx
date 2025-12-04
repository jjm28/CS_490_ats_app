import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNetworkRelationshipSummary } from "../../api/relationship";

interface Summary {
  totalContacts: number;
  avgRelationshipStrength: number;
  avgReciprocity: number;
}

interface HealthBreakdown {
  excellent: number;
  good: number;
  needs_attention: number;
  at_risk: number;
}

interface Engagement {
  byFrequency: Record<string, number>;
  avgDaysSinceLastContact: number;
}

interface HighValueConnection {
  id: string;
  name: string;
  company: string;
  relationshipStrength: number;
  reciprocityScore: number;
  opportunitiesGenerated: number;
  daysSinceLastContact: number | null;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  company: string;
  strength: number;
  opportunities: number;
  reciprocity: number;
}

interface NetworkRelationshipSummaryResponse {
  summary: Summary;
  healthBreakdown: HealthBreakdown;
  engagement: Engagement;
  highValueConnections: HighValueConnection[];
  insights: string[];
  bestInteractionTypes: { type: string; score: number }[];
  leaderboard: LeaderboardEntry[];
}

export default function NetworkingROI() {
  const [data, setData] = useState<NetworkRelationshipSummaryResponse | null>(null);

  useEffect(() => {
    getNetworkRelationshipSummary()
      .then(setData)
      .catch((err) => console.error("API ERROR:", err));
  }, []);

  if (!data)
    return <div className="p-6 text-lg font-medium">Loading relationship analytics...</div>;

  const { summary, healthBreakdown, engagement, highValueConnections, insights, leaderboard } =
    data;

  return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-2">
        Networking Relationship Analytics
      </h1>
      <p className="text-center text-gray-600">
        See which relationships and touchpoints are driving the most opportunity.
      </p>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Contacts" value={summary.totalContacts} />
        <Card title="Avg Strength" value={summary.avgRelationshipStrength.toFixed(1)} />
        <Card title="Avg Reciprocity" value={summary.avgReciprocity.toFixed(1)} />
      </div>

      {/* HEALTH + ENGAGEMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Relationship Health Overview">
          <Item label="Excellent" value={healthBreakdown.excellent} />
          <Item label="Good" value={healthBreakdown.good} />
          <Item label="Needs Attention" value={healthBreakdown.needs_attention} />
          <Item label="At Risk" value={healthBreakdown.at_risk} />
        </Section>

        <Section title="Engagement Patterns">
          <p className="mb-3 font-medium">
            Avg Days Since Last Contact: {engagement.avgDaysSinceLastContact.toFixed(1)}
          </p>
          <div className="space-y-1">
            {Object.entries(engagement.byFrequency).map(([k, v]) => (
              <Item key={k} label={k} value={v} />
            ))}
          </div>
        </Section>
      </div>

      {/* HIGH VALUE CONNECTIONS */}
      <Section title="High Value Connections">
        {highValueConnections.length === 0 && (
          <p className="text-gray-500">No high-value connections yet.</p>
        )}

        {highValueConnections.map((c) => (
          <Link
            key={c.id}
            to={`/networking/contacts/${c.id}`}
            className="block p-3 border rounded-lg shadow-sm bg-gray-50 mb-3 hover:bg-gray-100 transition"
          >
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-gray-600">{c.company}</p>
            <p>Strength: {c.relationshipStrength}</p>
            <p>Opportunities: {c.opportunitiesGenerated}</p>
            <p>Reciprocity: {c.reciprocityScore}</p>
          </Link>
        ))}
      </Section>

      {/* LEADERBOARD */}
      <Section title="Top Contacts Leaderboard">
        {leaderboard.length === 0 && (
          <p className="text-gray-500">Add more interactions to generate rankings.</p>
        )}

        {leaderboard.map((c, index) => (
          <Link
            to={`/networking/contacts/${c.id}`}
            key={c.id}
            className="flex justify-between items-center p-3 bg-white border rounded shadow mb-2 hover:bg-gray-100 transition"
          >
            <div>
              <p className="font-semibold">
                #{index + 1} — {c.name}
              </p>
              <p className="text-sm text-gray-600">{c.company}</p>
            </div>
            <div className="text-right text-sm">
              <p>Opportunities: {c.opportunities}</p>
              <p>Strength: {c.strength}</p>
              <p>Reciprocity: {c.reciprocity}</p>
            </div>
          </Link>
        ))}
      </Section>

      {/* INSIGHTS */}
      <Section title="AI Insights">
        {insights.map((ins, i) => (
          <p key={i} className="mb-2">
            • <span className="font-semibold">{ins.replace(/\*/g, "")}</span>
          </p>
        ))}
      </Section>
    </div>
  );
}

/* ---------------------------
   REUSABLE COMPONENTS
--------------------------- */

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow text-center">
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Item({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b py-1 text-sm">
      <span className="font-medium">{label}</span>
      <span>{value}</span>
    </div>
  );
}