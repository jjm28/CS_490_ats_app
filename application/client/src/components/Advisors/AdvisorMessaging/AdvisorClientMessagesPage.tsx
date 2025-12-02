// components/AdvisorPortal/AdvisorClientMessagesPage.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdvisorMessageThread from "../AdvisorMessaging/AdvisorMessageThread";

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?._id || null;
  } catch {
    return null;
  }
}

export default function AdvisorClientMessagesPage() {
  const { relationshipId } = useParams<{ relationshipId: string }>();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  if (!relationshipId || !currentUserId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-red-600">
          Missing client relationship or advisor. Please log in
          again.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => navigate("/advisor/clients")}
        >
          ← Back to clients
        </button>
        <h1 className="text-lg font-semibold">
          Client messages
        </h1>
      </div>

      <AdvisorMessageThread
        relationshipId={relationshipId}
        role="advisor"
        currentUserId={currentUserId}
      />
    </div>
  );
}
