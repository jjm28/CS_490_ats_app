import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { listResumes, deleteResume, updateResume } from "../../api/resumes"; 

function fmt(d?: string) {
  if (!d) return "";
  const t = new Date(d);
  return isNaN(t.getTime()) ? "" : t.toLocaleString();
}

export default function ResumeList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const data = await listResumes();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load resumes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this resume?")) return;
    try { await deleteResume(id); await load(); }
    catch (e: any) { alert(e?.message || "Delete failed"); }
  };

  const onRename = async (id: string, current: string) => {
    const name = prompt("Rename resume to:", current);
    if (!name) return;
    try { await updateResume(id, { name }); await load(); }
    catch (e: any) { alert(e?.message || "Rename failed"); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Resumes</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/templates")}>Create from template</Button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && items.length === 0 && (
        <Card>You don’t have any resumes yet. Click “Create from template” to get started.</Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((r) => (
          <Card key={r._id} className="flex flex-col gap-2">
            <div className="text-lg font-semibold">{r.name}</div>
            <div className="text-sm text-gray-600">Updated: {fmt(r.updatedAt)}</div>
            <div className="mt-auto flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => navigate(`/resumes/${r._id}/edit`)}>Edit</Button>
              <Button variant="secondary" onClick={() => onRename(r._id, r.name)}>Rename</Button>
              <Button variant="secondary" onClick={() => onDelete(r._id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
