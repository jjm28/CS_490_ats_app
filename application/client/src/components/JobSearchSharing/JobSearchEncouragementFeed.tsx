import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import type { EncouragementEvent } from "../../api/jobSearchSharing";
import { fetchEncouragementEvents } from "../../api/jobSearchSharing";

interface Props {
  currentUserId: string;
}

export default function JobSearchEncouragementFeed({ currentUserId }: Props) {
  const [events, setEvents] = useState<EncouragementEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEncouragementEvents(currentUserId, 20);
        if (!mounted) return;
        setEvents(data);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Error loading encouragement events");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [currentUserId]);

  return (
    <Card className="p-4 space-y-3 mt-4">
      <h2 className="text-lg font-semibold">Wins & Encouragement</h2>
      <p className="text-sm text-gray-600">
        A history of your completed goals and key milestones.
      </p>

      {loading && <p className="text-sm">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && events.length === 0 && !error && (
        <p className="text-sm text-gray-600">
          No encouragement events yet. Complete a goal or add a milestone to see your first celebration.
        </p>
      )}

      <div className="space-y-2 text-sm">
        {events.map((e) => {
          const created = new Date(e.createdAt).toLocaleString();
          let label = "Achievement";

          if (e.type === "goal_completed") label = "Goal completed";
          else if (e.type === "milestone_added") label = "Milestone";

          return (
            <div key={e._id} className="border rounded-md p-2 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {label}
                </span>
                <span className="text-[10px] text-gray-500">{created}</span>
              </div>
              <p className="text-sm">{e.message}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
