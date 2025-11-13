import { useState, useEffect } from "react";
import { listResumes } from "../../api/resumes";
import { listCoverletters } from "../../api/coverletter";

interface Props {
  config: any;
  onChange: (updated: any) => void;
}

export default function TemplateResponseConfig({ config, onChange }: Props) {
  const [resumes, setResumes] = useState<any[]>([]);
  const [coverletters, setCoverletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const userRaw = localStorage.getItem("authUser");
  const userid =
    userRaw && typeof userRaw === "string"
      ? JSON.parse(userRaw).user?._id
      : null;

  useEffect(() => {
    const load = async () => {
      try {
        if (!userid) return;

        const resumeData = await listResumes({ userid });
        setResumes(resumeData);

        const coverData = await listCoverletters({ userid });
        setCoverletters(coverData);
      } catch (err) {
        console.error("Failed to load template assets:", err);
      }
      setLoading(false);
    };

    load();
  }, [userid]);

  if (loading) return <p>Loading templates…</p>;

  return (
    <div className="space-y-4">

      {/* QUESTION SELECTOR */}
      <div>
        <label className="block font-medium mb-1">
          Application Question
        </label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={config.question || ""}
          onChange={(e) =>
            onChange({
              ...config,
              question: e.target.value,
            })
          }
        >
          <option value="">-- Select a Question --</option>
          <option value="why_company">Why do you want to work here?</option>
          <option value="strengths">What are your strengths?</option>
          <option value="weaknesses">What is your biggest weakness?</option>
          <option value="experience">Tell us about a past experience.</option>
          <option value="salary">Expected salary?</option>
          <option value="relocation">Are you open to relocation?</option>
        </select>
      </div>

      {/* ANSWER TEMPLATE */}
      <div>
        <label className="block font-medium mb-1">Template Response</label>
        <textarea
          className="border rounded px-3 py-2 w-full h-32"
          placeholder="Your reusable answer..."
          value={config.answer || ""}
          onChange={(e) =>
            onChange({
              ...config,
              answer: e.target.value,
            })
          }
        />
      </div>

      {/* OPTIONAL RESUME ATTACHMENT */}
      <div>
        <label className="block font-medium mb-1">Attach Resume (Optional)</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={config.resumeId || ""}
          onChange={(e) =>
            onChange({
              ...config,
              resumeId: e.target.value,
            })
          }
        >
          <option value="">None</option>
          {resumes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.filename}
            </option>
          ))}
        </select>
      </div>

      {/* OPTIONAL COVER LETTER ATTACHMENT */}
      <div>
        <label className="block font-medium mb-1">
          Attach Cover Letter (Optional)
        </label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={config.coverletterId || ""}
          onChange={(e) =>
            onChange({
              ...config,
              coverletterId: e.target.value,
            })
          }
        >
          <option value="">None</option>
          {coverletters.map((c) => (
            <option key={c._id} value={c._id}>
              {c.filename}
            </option>
          ))}
        </select>
      </div>

    </div>
  );
}