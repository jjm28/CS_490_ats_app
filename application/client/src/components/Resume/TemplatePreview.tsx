// components/Resume/TemplatePreview.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { getTemplate } from "../../api/templates"; 
import ResumePageRenderer from "./ResumePageRenderer";
import { dummyDataFor } from "./dummyResume";

export default function TemplatePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tpl, setTpl] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const t = await getTemplate(id!);
        setTpl(t);
      } catch (e: any) {
        setErr(e?.message || "Failed to load template.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (err) return <p className="p-6 text-red-600">{err}</p>;
  if (!tpl) return <Card>Template not found.</Card>;

  const dummy = dummyDataFor(tpl.type || "custom");

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Preview: {tpl.name}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/templates")}>Back</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <ResumePageRenderer template={tpl} data={dummy} />
    </div>
  );
}
