// JobSearchSharingPage.tsx
import React from "react";
import JobSearchSharingSettings from "./JobSearchSharingSettings";

export default function JobSearchSharingPage() {

  const currentUserId =  JSON.parse(localStorage.getItem("authUser") ?? "").user._id ;

  return (
    <div className="max-w-4xl mx-auto mt-6 px-4">
      <JobSearchSharingSettings currentUserId={currentUserId} />
    </div>
  );
}
