import React, { useEffect, useState } from "react";
import { getGoals, updateGoals } from "../../../api/goals";

export default function GoalsEditor({ onUpdate }: { onUpdate: () => void }) {
  const [weeklyApplicationsGoal, setWeeklyApplicationsGoal] = useState(10);
  const [weeklyInterviewsGoal, setWeeklyInterviewsGoal] = useState(2);
  const [saving, setSaving] = useState(false);

  // Load existing goals on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await getGoals();
        setWeeklyApplicationsGoal(data.weeklyApplicationsGoal ?? 10);
        setWeeklyInterviewsGoal(data.weeklyInterviewsGoal ?? 2);
      } catch (err) {
        console.error("Failed to load goals", err);
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await updateGoals({
        weeklyApplicationsGoal,
        weeklyInterviewsGoal,
      });

      onUpdate(); // Refresh the dashboard
    } catch (err) {
      console.error("Failed to update goals:", err);
    }
    setSaving(false);
  }

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "10px", background: "white" }}>
      <h3 style={{ marginBottom: "15px" }}>🎯 Set Your Weekly Goals</h3>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "bold" }}>Weekly Applications Goal</label>
        <input
          type="number"
          min="1"
          value={weeklyApplicationsGoal}
          onChange={(e) => setWeeklyApplicationsGoal(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "8px",
            marginTop: "5px",
            borderRadius: "6px",
            border: "1px solid #aaa",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "bold" }}>Weekly Interviews Goal</label>
        <input
          type="number"
          min="1"
          value={weeklyInterviewsGoal}
          onChange={(e) => setWeeklyInterviewsGoal(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "8px",
            marginTop: "5px",
            borderRadius: "6px",
            border: "1px solid #aaa",
          }}
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          background: saving ? "#ccc" : "#007bff",
          color: "white",
          padding: "10px 15px",
          borderRadius: "8px",
          width: "100%",
          cursor: "pointer",
          border: "none",
          fontWeight: "bold",
        }}
      >
        {saving ? "Saving..." : "Save Goals"}
      </button>
    </div>
  );
}