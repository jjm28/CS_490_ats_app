import React, { useEffect, useState } from "react";
import JobSearchSharingSettings from "./JobSearchSharingSettings";
import JobSearchProgressPanel from "./JobSearchProgressPanel";
import JobSearchReportGenerator from "./JobSearchReportGenerator";
import JobSearchEncouragementFeed from "./JobSearchEncouragementFeed";
import Card from "../StyledComponents/Card";
import fireConfetti from "./confetti.ts";

type CelebrationToast = {
  id: number;
  message: string;
};

export default function JobSearchSharingPage() {
  // const { user } = useAuth();
  // if (!user) return null;
  // const currentUserId = user._id;

  const currentUserId = "mockUserId"; // replace with real user id

  const [toast, setToast] = useState<CelebrationToast | null>(null);

  const handleCelebrate = (message: string) => {
    fireConfetti(3000);
    setToast({
      id: Date.now(),
      message,
    });
  };

  // auto-hide toast after 3.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="relative max-w-4xl mx-auto mt-6 px-4 space-y-4">
      {/* celebration toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <Card className="px-4 py-3 shadow-lg flex items-center gap-2">
            <span role="img" aria-label="celebration">
              🎉
            </span>
            <span className="text-sm">{toast.message}</span>
          </Card>
        </div>
      )}

      <JobSearchSharingSettings currentUserId={currentUserId} />

      <JobSearchProgressPanel
        currentUserId={currentUserId}
        onCelebrate={handleCelebrate}
      />

      <JobSearchReportGenerator currentUserId={currentUserId} />
      <JobSearchEncouragementFeed currentUserId={currentUserId} />
    </div>
  );
}
