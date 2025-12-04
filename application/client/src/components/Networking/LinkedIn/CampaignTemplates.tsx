import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCampaignTemplates, type CampaignTemplate } from "../../../api/linkedin";
import { Target, Users, Calendar, List } from "lucide-react";

export default function CampaignTemplates() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await getCampaignTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-600 animate-pulse">
        Loading templates...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking/linkedin")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-gradient-to-r from-[#0A66C2] to-[#004182] 
                   rounded-lg shadow hover:opacity-90 transition"
      >
        ← Back to LinkedIn Tools
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Target className="w-8 h-8 text-indigo-600" />
          Networking Campaign Templates
        </h1>
        <p className="text-gray-600 mt-2">
          Structured campaigns to achieve your networking goals
        </p>
      </div>

      {/* Templates List */}
      <div className="space-y-6">
        {templates.map((template, idx) => (
          <div
            key={idx}
            className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
          >
            {/* Template Header */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {template.name}
              </h3>
              <p className="text-gray-600">{template.description}</p>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="font-semibold text-gray-900">Target</div>
                  <div className="text-gray-600">{template.targetAudience}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Timeline</div>
                  <div className="text-gray-600">{template.timeline}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <List className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900">Steps</div>
                  <div className="text-gray-600">{template.steps.length} steps</div>
                </div>
              </div>
            </div>

            {/* Expandable Steps */}
            <button
              onClick={() => setExpandedId(expandedId === idx ? null : idx)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {expandedId === idx ? "Hide steps ▲" : "Show steps ▼"}
            </button>

            {expandedId === idx && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Campaign Steps:</h4>
                <ol className="space-y-2">
                  {template.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {stepIdx + 1}
                      </span>
                      <span className="text-gray-700 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}