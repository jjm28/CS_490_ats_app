import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import { listEmployment, deleteEmployment, type Employment } from "../../api/employment";



const EmploymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Employment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listEmployment();
      setItems(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load employment history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const addNew = () => navigate("/EmploymentForm");
  const edit = (id: string) => navigate(`/EmploymentForm/${id}`);
  
  const del = async (id: string) => {
    if (items.length <= 1) {
      alert("You must have at least one employment entry.");
      return;
    }
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteEmployment(id);
      setFlash("Entry deleted successfully.");
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  const canDelete = items.length > 1;
  

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Employment History</h1>
      <p className="text-gray-600 mb-6">
        Add and manage your work experience entries.
      </p>

      {flash && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {flash}
        </div>
      )}

      <div className="mb-4">
        <Button onClick={addNew}>Add Employment</Button>
        {!canDelete && items.length === 1 && !loading && !err && (
          <div className="mt-1">
          <span className="text-xs text-gray-600"> Delete not Available. </span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : items.length === 0 ? (
        <div className="rounded-md border p-4 bg-white text-sm text-gray-700">
          No employment entries yet. Click “Add Employment” to create one.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e._id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900">{e.jobTitle}</div>
                  <div className="text-sm text-gray-700">{e.company}{e.location ? ` — ${e.location}` : ''}</div>
                  <div className="text-xs text-gray-600">
                    {e.startDate?.slice(0,10)} – {e.currentPosition ? "Present" : (e.endDate ? e.endDate.slice(0,10) : "N/A")}
                  </div>
                  {e.description && (
                    <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {e.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => edit(e._id!)}>Edit</Button>
                  {/*<Button onClick={() => del(e._id!)} variant="secondary">Delete</Button>*/}
                  {canDelete && (
                    <Button onClick={() => del(e._id!)} variant="secondary">
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EmploymentPage;
