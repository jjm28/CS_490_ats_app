import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type Resume = { id: string; name: string; templateId: string; content: any; createdAt: string };

export default function ResumeCreator() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const templateId = sp.get("templateId");
    const name = sp.get("name") || "Untitled Resume";
    if (!templateId) { navigate("/templates"); return; }

    const raw = localStorage.getItem("resumes");
    const resumes: Resume[] = raw ? JSON.parse(raw) : [];
    const id = crypto.randomUUID();
    const resume: Resume = {
      id,
      name,
      templateId,
      content: {}, // start blank; you can copy from another resume later
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("resumes", JSON.stringify([resume, ...resumes]));
    navigate(`/resumes/${id}`); // route to your resume editor/view when ready
  }, [navigate, sp]);

  return <div className="p-6">Creating resume…</div>;
}
