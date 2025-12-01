import React, { useEffect, useState } from "react";
import JobSearchSharingSettings from "./JobSearchSharingSettings";
import JobSearchProgressPanel from "./JobSearchProgressPanel";
import JobSearchReportGenerator from "./JobSearchReportGenerator";
import JobSearchEncouragementFeed from "./JobSearchEncouragementFeed";
import Card from "../StyledComponents/Card";
import fireConfetti from "./confetti.ts";
import JobSearchPartnerEngagement from "./JobSearchPartnerEngagement.tsx";
import JobSearchMotivationPanel from "./JobSearchMotivationPanel.tsx";
import { ToastContainer, toast ,Bounce} from 'react-toastify';

type CelebrationToast = {
  id: number;
  message: string;
};

export default function JobSearchSharingPage() {


  const currentUserId = JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";

  const [notifymsg, setnotifymsg] = useState<CelebrationToast | null>(null);
const [motivationRefreshKey, setMotivationRefreshKey] = useState(0);

const handleActivityChange = () => {
  setMotivationRefreshKey((prev) => prev + 1);
};
  const notify = () =>toast.success(notifymsg?.message, {
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
    console.log("ds")
     notify()
  };

  return (
     <div className="relative max-w-4xl mx-auto mt-6 px-4 space-y-4">
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

      <JobSearchSharingSettings currentUserId={currentUserId} />

     <JobSearchProgressPanel
  currentUserId={currentUserId}
  onCelebrate={handleCelebrate}
  onActivityChange={handleActivityChange}
/>


      <JobSearchReportGenerator currentUserId={currentUserId} />

      <JobSearchEncouragementFeed currentUserId={currentUserId} />

<JobSearchMotivationPanel
  currentUserId={currentUserId}
  refreshKey={motivationRefreshKey}
/>
      <JobSearchPartnerEngagement currentUserId={currentUserId} />
    </div>
  );
}
