import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import JobsPipeline from "../../components/Jobs/JobsPipeline";

const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Application Pipeline
        </h1>

        <Button
          variant="secondary"
          onClick={() => navigate("/Applications/Analytics")}
        >
          View Analytics
        </Button>
      </div>

      <JobsPipeline />
    </div>
  );
};

export default ApplicationsPage;