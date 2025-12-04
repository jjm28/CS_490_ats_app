import { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Line } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function NetworkingAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [roiList, setRoiList] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  /* ----------------------------------------
      FETCH METRICS + ROI LIST
  ---------------------------------------- */
  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("authToken");

      // Load event counts
      const m = await axios.get("/api/networking/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Load ROI for each event
      const r = await axios.get("/api/networking/metrics/roi", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Load full events for date graphs
      const e = await axios.get("/api/networking/events", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMetrics(m.data);
      setRoiList(r.data);
      setEvents(e.data);

      setLoading(false);
    } catch (err) {
      console.error("Analytics load error:", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <p className="p-6">Loading analytics...</p>;

  /* -----------------------------------------------------
        ROI BAR CHART
  ------------------------------------------------------ */
  const roiData = {
    labels: roiList.map((e) => e.title),
    datasets: [
      {
        label: "ROI Score",
        data: roiList.map((e) => e.roi),
        backgroundColor: "rgba(99,102,241,0.7)", // indigo-500
      },
    ],
  };

  /* -----------------------------------------------------
        EVENT TIMELINE LINE CHART
  ------------------------------------------------------ */
  const sortedEvents = [...events].sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const timelineData = {
    labels: sortedEvents.map((e) =>
      new Date(e.date).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Events Over Time",
        data: sortedEvents.map((_, i) => i + 1),
        borderColor: "rgba(34,197,94,1)", // green-500
        backgroundColor: "rgba(34,197,94,0.3)",
        tension: 0.3,
      },
    ],
  };

  /* -----------------------------------------------------
        METRIC CARDS
  ------------------------------------------------------ */
  const MetricCard = ({ title, value }: any) => (
    <div className="p-4 bg-white rounded-lg shadow border text-center">
      <p className="text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
             {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-6 px-4 py-2 text-sm border rounded hover:bg-gray-100 transition"
      >
        ← Back to Network Dashboard
      </button>
      <h1 className="text-3xl font-bold mb-6 text-center">
        Networking Analytics
      </h1>

      {/* METRIC SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <MetricCard title="Total Events" value={metrics.events} />
        <MetricCard title="Connections Made" value={metrics.connections} />
        <MetricCard title="Follow-Ups Completed" value={metrics.followups} />
      </div>

      {/* ROI SCORE CHART */}
      <div className="bg-white p-6 rounded-lg shadow border mb-10">
        <h2 className="text-xl font-semibold mb-4">Event ROI Scores</h2>
        <Bar data={roiData} />
      </div>

      {/* EVENT TIMELINE CHART */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">Event Growth Over Time</h2>
        <Line data={timelineData} />
      </div>
    </div>
  );
}
