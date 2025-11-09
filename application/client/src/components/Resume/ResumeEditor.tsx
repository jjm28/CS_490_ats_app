import { useEffect, useState } from "react";                     
import { useParams, useNavigate, useLocation } from "react-router-dom";                    
import { getResume, updateResume, deleteResume } from "../../api/resumes";     
import Button from "../StyledComponents/Button";    
             


export default function ResumeEditor() { 
  const navigate = useNavigate();                        
  const { id } = useParams();
  const [resume, setResume] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false); 
  const location = useLocation();
  const isDraft = Boolean((location.state as any)?.draft);

  const markDirty = () => setDirty(true); 

  useEffect(() => {
    (async () => {
      try {
        const data = await getResume(id!);
        setResume(data);
      } catch (e: any) {
        setErr(e?.message || "Failed to load resume");
      }
    })();
  }, [id]);

  const onChange = (section: string, value: string) => {
    setResume((r: any) => ({
      ...r,
      content: {
        ...r.content,
        sections: {
          ...(r.content?.sections || {}),
          [section]: { ...(r.content?.sections?.[section] || {}), text: value },
        },
      },
    }));
  };

  const handleCancel = async () => {                          
    // Optional confirm to prevent accidental loss:
    if (dirty && !window.confirm("Discard changes and go back to templates?")) {
      return;
    }
    navigate("/templates", { replace: true });          // go back without saving

    try {
      // If this editor opened a fresh, just-created draft, delete it
      if (isDraft && id) {
        await deleteResume(id);                      // NEW: remove from DB
      }
    } catch (e) {
      // swallow errors on cancel-delete; we still navigate away
      console.warn("Cancel delete failed:", e);
    } finally {
      navigate("/templates", { replace: true });     // back to templates
    }

  };

  const onSave = async () => {
    if (!resume) return;
    //setSaving(true);
    setErr(null);
    try {
      //await updateResume(resume._id, { name: resume.name, content: resume.content });
      setSaving(true);
      setDirty(true);
      navigate("/resumes", { state: { flash: "Resume saved" } })
      
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
    //navigate("/resumes", { state: { flash: "Resume saved successfully" } });
  };

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!resume) return <div className="p-6">Loading…</div>;

  const sections: string[] = resume.content?.layout?.sections || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Edit: {resume.name}</h1>

      {sections.length === 0 ? (
        <p className="text-gray-600">This template has no section list.</p>
      ) : (
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s} className="border rounded-lg p-3 bg-white">
              <div className="font-semibold mb-2">{s}</div>
              <textarea
                className="form-input"
                rows={4}
                value={resume.content?.sections?.[s]?.text || ""}
                onChange={(e) => onChange(s, e.target.value)}
                placeholder={`Write ${s}…`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <Button type="button" className="px-3 py-2 rounded-md border" onClick={handleCancel}>Cancel</Button> 
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>

      </div>
    </div>
  );
}
