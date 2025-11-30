// src/api/smartGoals.ts
import API_BASE from "../utils/apiBase";

const DEV_USER_ID = "064cfccd-55e0-4226-be75-ba9143952fc4";

// Shared headers used across your app
function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "x-dev-user-id": DEV_USER_ID,
  };
}

export interface ShortTermGoal {
  _id?: string;
  title: string;
  deadline: string;
  completed: boolean;
  completedAt?: string | null;
  linkedJobId?: string | null;
}

export interface Goal {
  _id: string;
  specific: string;
  measurable: string;
  achievable: boolean;
  relevant: boolean;
  deadline: string;
  shortTermGoals: ShortTermGoal[];
  createdAt: string;
  updatedAt: string;
  linkedJobId?: string | null;
}

export interface CreateGoalPayload {
  specific: string;
  achievable: boolean;
  relevant: boolean;
  deadline: string;
  linkedJobId?: string | null;
  shortTermGoals: { title: string; deadline: string }[];
}

export async function fetchGoals(): Promise<Goal[]> {
  const res = await fetch(`${API_BASE}/api/smart-goals`, {
    headers: {
      ...baseHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load goals");
  }

  return res.json();
}

export async function createGoal(payload: CreateGoalPayload): Promise<Goal> {
  const res = await fetch(`${API_BASE}/api/smart-goals`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create goal");
  }

  return res.json();
}

export async function toggleShortTermCompletion(
  goalId: string,
  shortTermId: string,
  completed: boolean
): Promise<Goal> {
  const res = await fetch(
    `${API_BASE}/api/smart-goals/${goalId}/short-term/${shortTermId}`,
    {
      method: "PATCH",
      headers: {
        ...baseHeaders(),
      },
      body: JSON.stringify({ completed }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update short-term goal");
  }

  return res.json();
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/smart-goals/${id}`, {
    method: "DELETE",
    headers: {
      ...baseHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to delete goal");
  }
}