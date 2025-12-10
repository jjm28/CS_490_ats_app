import React, { useState } from "react";
import JobSearchSharingSettings from "./JobSearchSharingSettings";
import JobSearchProgressPanel from "./JobSearchProgressPanel";
import JobSearchReportGenerator from "./JobSearchReportGenerator";
import JobSearchEncouragementFeed from "./JobSearchEncouragementFeed";
import Card from "../StyledComponents/Card";
import fireConfetti from "./confetti.ts";
import JobSearchPartnerEngagement from "./JobSearchPartnerEngagement.tsx";
import JobSearchMotivationPanel from "./JobSearchMotivationPanel.tsx";
import { ToastContainer, toast, Bounce } from "react-toastify";
import JobSearchAccountabilityInsights from "./JobSearchAccountabilityInsights";
import JobSearchDiscussionPanel from "./JobSearchDiscussionPanel.tsx";

type CelebrationToast = {
  id: number;
  message: string;
};

export default function JobSearchSharingPage() {
  const currentUserId =
    JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";

  const [notifymsg, setnotifymsg] = useState<CelebrationToast | null>(null);
  const [motivationRefreshKey, setMotivationRefreshKey] = useState(0);

  const handleActivityChange = () => {
    setMotivationRefreshKey((prev) => prev + 1);
  };

  const notify = () =>
    toast.success(notifymsg?.message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      transition: Bounce,
    });

  const handleCelebrate = (message: string) => {
    fireConfetti(3000);
    setnotifymsg({
      id: Date.now(),
      message,
    });
    notify();
  };

  return (
    <div className="relative max-w-6xl mx-auto mt-6 px-4 space-y-6">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />

      {/* Page header */}
        <h1 className="text-xl font-semibold">
          Job Search Sharing & Accountability
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure who can see your job search progress, track your goals, and
          collaborate with accountability partners.
        </p>

      {/* Sharing settings always full width */}
      <JobSearchSharingSettings currentUserId={currentUserId} />

      {/* Main dashboard layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        {/* LEFT COLUMN – your progress + conversation */}
        <div className="space-y-4">
          {/* Goals & milestones */}
          <JobSearchProgressPanel
            ownerUserId={currentUserId}
            currentUserId={currentUserId}
            mode="owner"
            onCelebrate={handleCelebrate}
            onActivityChange={handleActivityChange}
          />

          {/* Motivation & daily activity */}
          <JobSearchMotivationPanel
            ownerUserId={currentUserId}
            viewerUserId={currentUserId}
            refreshKey={motivationRefreshKey}
          />

          {/* Discussion with accountability partners */}
          <JobSearchDiscussionPanel
            ownerUserId={currentUserId}
            currentUserId={currentUserId}
          />
        </div>

        {/* RIGHT COLUMN – accountability tools & analytics */}
        <div className="space-y-4">
          {/* Recent wins / encouragement feed */}
          <JobSearchEncouragementFeed currentUserId={currentUserId} />

          {/* Progress report generator for mentors/partners */}
          <JobSearchReportGenerator currentUserId={currentUserId} />

          {/* Partner engagement overview */}
          <JobSearchPartnerEngagement currentUserId={currentUserId} />

          {/* Accountability impact insights */}
          <JobSearchAccountabilityInsights currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}
