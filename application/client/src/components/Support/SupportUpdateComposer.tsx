import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type { Supporter } from "../../types/support.types";

const SUPPORTERS_ENDPOINT = `${API_BASE}/api/supporters`;
const SUPPORT_UPDATES_ENDPOINT = `${API_BASE}/api/supporters/supportupdate`;

type SupportUpdateType = "WEEKLY_SUMMARY" | "TODAY_FEELING" | "PLAN" | "OTHER";
type SupportUpdateTone = "positive" | "mixed" | "tough" | "neutral";

interface Props {
  userId: string;
}

export default function SupportUpdateComposer({ userId }: Props) {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loadingSupporters, setLoadingSupporters] = useState(false);

  const [type, setType] = useState<SupportUpdateType>("WEEKLY_SUMMARY");
  const [title, setTitle] = useState("Weekly update");
  const [body, setBody] = useState("");
  const [toneTag, setToneTag] = useState<SupportUpdateTone | "">("");
  const [visibility, setVisibility] = useState<"all" | "custom">("all");
  const [selectedSupporterIds, setSelectedSupporterIds] = useState<string[]>(
    []
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load supporters when this panel mounts
  useEffect(() => {
    const fetchSupporters = async () => {
      try {
        setLoadingSupporters(true);
        const res = await fetch(
          `${SUPPORTERS_ENDPOINT}?userId=${userId}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data: Supporter[] = await res.json();
        setSupporters(data.filter((s) => s.status === "accepted"));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSupporters(false);
      }
    };
    fetchSupporters();
  }, [userId]);

  // Adjust default title when type changes (if user hasn't edited yet)
  useEffect(() => {
    setSuccessMsg(null);
    setError(null);
    if (type === "WEEKLY_SUMMARY") {
      setTitle("Weekly update");
    } else if (type === "TODAY_FEELING") {
      setTitle("How I’m feeling today");
    } else if (type === "PLAN") {
      setTitle("Plan for next week");
    } else {
      setTitle("Update from me");
    }
  }, [type]);

  const toggleSupporter = (id: string) => {
    setSelectedSupporterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    if (visibility === "custom" && selectedSupporterIds.length === 0) {
      setError("Select at least one supporter, or choose 'All'.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(
        `${SUPPORT_UPDATES_ENDPOINT}?userId=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type,
            title: title.trim(),
            body: body.trim(),
            toneTag: toneTag || undefined,
            visibility,
            supporterIds:
              visibility === "custom" ? selectedSupporterIds : undefined,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to post update.");
      }

      setBody("");
      setToneTag("");
      setVisibility("all");
      setSelectedSupporterIds([]);
      setSuccessMsg("Update shared with your supporters.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Share an update</h2>
          <p className="text-xs text-gray-600">
            Let your supporters know how your job search is going, in your own words.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-[11px] font-medium mb-1">
              Type of update
            </label>
            <select
              className="border rounded px-2 py-1 text-xs"
              value={type}
              onChange={(e) => setType(e.target.value as SupportUpdateType)}
            >
              <option value="WEEKLY_SUMMARY">Weekly summary</option>
              <option value="TODAY_FEELING">How I’m feeling today</option>
              <option value="PLAN">Plan / focus</option>
              <option value="OTHER">Other update</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1">
              Tone (optional)
            </label>
            <select
              className="border rounded px-2 py-1 text-xs"
              value={toneTag}
              onChange={(e) =>
                setToneTag(e.target.value as SupportUpdateTone | "")
              }
            >
              <option value="">No tag</option>
              <option value="positive">Mostly positive 😊</option>
              <option value="mixed">Mixed / ups and downs 😐</option>
              <option value="tough">Tough week 🥲</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1">
            Title
          </label>
          <input
            className="w-full border rounded px-2 py-1 text-xs"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1">
            Message
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-xs"
            rows={3}
            placeholder="E.g., I sent out 5 applications this week and had one phone screen. I’m a bit tired but feeling okay overall."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Only share details you’d be comfortable saying to them directly.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1">
            Who should see this?
          </label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                value="all"
                checked={visibility === "all"}
                onChange={() => setVisibility("all")}
              />
              <span>All accepted supporters</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                value="custom"
                checked={visibility === "custom"}
                onChange={() => setVisibility("custom")}
              />
              <span>Choose specific people</span>
            </label>
          </div>

          {visibility === "custom" && (
            <div className="border rounded px-2 py-2 max-h-32 overflow-y-auto">
              {loadingSupporters ? (
                <p className="text-[11px] text-gray-500">Loading supporters…</p>
              ) : supporters.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  You don&apos;t have any accepted supporters yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {supporters.map((s) => (
                    <label
                      key={s._id}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSupporterIds.includes(s._id)}
                        onChange={() => toggleSupporter(s._id)}
                      />
                      <span>
                        {s.fullName} ({s.relationship})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-[11px] text-red-500">{error}</p>}
        {successMsg && (
          <p className="text-[11px] text-green-600">{successMsg}</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sharing..." : "Post update"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
