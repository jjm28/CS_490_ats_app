// src/components/Teams/CreateTeamPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { createTeam } from "../../api/teams";

const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [billingPlan, setBillingPlan] = useState<"free" | "pro">("free");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const team = await createTeam({
        name: name.trim(),
        description: description.trim(),
        billingPlan,
      });

      // Navigate to the new team’s detail page
      if (team && (team as any)._id) {
        navigate(`/teams/${(team as any)._id}`);
      } else {
        navigate("/teams");
      }
    } catch (err: any) {
      console.error("Error creating team:", err);
      setError(err?.message || "Failed to create team.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Create a New Team
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Set up a coaching team so you can invite mentors and candidates
            and track progress together.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/teams")}>
          Back to Teams
        </Button>
      </div>

      <Card>
        {error && (
          <p className="mb-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-w-2xl"
        >
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Team Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="e.g. Spring 2026 SWE Coaching Group"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              rows={3}
              placeholder="Short description of who this team supports"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Billing Plan
            </label>
            <select
              value={billingPlan}
              onChange={(e) =>
                setBillingPlan(e.target.value as "free" | "pro")
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="free">Free</option>
              <option value="pro">Pro (placeholder)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Billing is controlled by the team admin. This can be updated
              later.
            </p>
          </div>

          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create Team"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CreateTeamPage;
