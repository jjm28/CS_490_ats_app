import { useEffect, useState } from "react";
import axios from "axios";

export default function NetworkingMetricsCard() {
  const [metrics, setMetrics] = useState({
    events: 0,
    connections: 0,
    followups: 0,
  });

  const loadMetrics = async () => {
    try {
      const res = await axios.get("/networking/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Error loading metrics:", err);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="border rounded-lg p-5 bg-white shadow-sm w-full">
      <h2 className="text-lg font-semibold mb-4">Networking ROI</h2>

      <div className="grid grid-cols-3 text-center">
        <div>
          <p className="text-2xl font-bold">{metrics.events}</p>
          <p className="text-gray-600 text-sm">Events</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{metrics.connections}</p>
          <p className="text-gray-600 text-sm">Connections</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{metrics.followups}</p>
          <p className="text-gray-600 text-sm">Follow-Ups</p>
        </div>
      </div>
    </div>
  );
}
