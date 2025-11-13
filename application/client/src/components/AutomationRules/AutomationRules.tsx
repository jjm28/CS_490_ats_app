import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import RuleList from "./RuleList";

const AutomationRules: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Automation Rules
      </h1>

      <p className="text-center text-gray-600 mb-6">
        Manage your job application automation rules here.
      </p>

      <div className="flex justify-center gap-3 mb-8">
        <Button variant="secondary" onClick={() => navigate("/Applications")}>
          Back to Pipeline
        </Button>

        <Button variant="primary" onClick={() => navigate("/automation/new")}>
          Create New Rule
        </Button>
      </div>

      {/* 🔥 Rule List */}
      <RuleList />
    </div>
  );
};

export default AutomationRules;