import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";


type Interaction = {
  contactId: string;
  name: string;
  type: string;
  note: string;
  date: string;
};

export default function AllInteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

  const token = JSON.parse(localStorage.getItem("authUser") || "{}")?.token || "";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/networking/interactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load interactions");

        const data = await res.json();
        setInteractions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div style={{ padding: "40px" }}>
        <button
  onClick={() => navigate("/networking")}
  className="mb-6 px-4 py-2 text-sm font-medium text-white bg-[#0A66C2] 
             rounded hover:bg-[#004182] transition shadow"
>
  ← Back to Network Dashboard
</button>

      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        All Interactions
      </h2>

      {loading && <p>Loading...</p>}

      {!loading && interactions.length === 0 && (
        <p style={{ textAlign: "center", color: "gray" }}>
          No interactions found.
        </p>
      )}

      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {interactions.map((i, idx) => (
          <div
            key={idx}
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              marginBottom: "20px"
            }}
          >
            <strong>Type:</strong> {i.type} <br />
            <strong>Notes:</strong> {i.note} <br />
            <strong>Date:</strong> {new Date(i.date).toLocaleDateString()}
          </div>
        ))}
      </div>
    </div>
  );
}
