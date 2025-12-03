import React, { useEffect, useState } from "react";
import { getGoals, updateGoals } from "../../../api/goals";

export default function GoalsEditor({ onUpdate }: { onUpdate: () => void }) {
  const [weeklyApplicationsGoal, setWeeklyApplicationsGoal] = useState<string>("");
  const [weeklyInterviewsGoal, setWeeklyInterviewsGoal] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Load existing goals on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await getGoals();

        setWeeklyApplicationsGoal(
          data.weeklyApplicationsGoal?.toString() ?? ""
        );
        setWeeklyInterviewsGoal(
          data.weeklyInterviewsGoal?.toString() ?? ""
        );
      } catch (err) {
        console.error("Failed to load goals", err);
      }
    }
    load();
  }, []);

  // Clean leading zeros
  function removeLeadingZeros(value: string) {
    return value.replace(/^0+(?=\d)/, ""); // removes only *leading* zeros
  }

  async function save() {
    setSaving(true);
    try {
      await updateGoals({
        weeklyApplicationsGoal: Number(weeklyApplicationsGoal || 0),
        weeklyInterviewsGoal: Number(weeklyInterviewsGoal || 0),
      });

      onUpdate(); // Refresh the dashboard
    } catch (err) {
      console.error("Failed to update goals:", err);
    }
    setSaving(false);
  }

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "10px",
        background: "white",
      }}
    >
      <h3 style={{ marginBottom: "15px" }}>🎯 Set Your Weekly Goals</h3>

      {/* Weekly Applications */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "bold" }}>Weekly Applications Goal</label>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={weeklyApplicationsGoal}
          onChange={(e) =>
            setWeeklyApplicationsGoal(removeLeadingZeros(e.target.value))
          }
          style={{
            width: "100%",
            padding: "8px",
            marginTop: "5px",
            borderRadius: "6px",
            border: "1px solid #aaa",
          }}
        />
      </div>

      {/* Weekly Interviews */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "bold" }}>Weekly Interviews Goal</label>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={weeklyInterviewsGoal}
          onChange={(e) =>
            setWeeklyInterviewsGoal(removeLeadingZeros(e.target.value))
          }
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