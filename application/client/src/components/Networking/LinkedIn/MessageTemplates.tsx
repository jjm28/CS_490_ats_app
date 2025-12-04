import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMessageTemplates,
  generateMessageTemplate,
  type MessageTemplate,
} from "../../../api/linkedin";
import { MessageSquare, Copy, Check, Sparkles } from "lucide-react";

export default function MessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorForm, setGeneratorForm] = useState({
    scenario: "",
    recipientInfo: "",
    userInfo: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await getMessageTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!generatorForm.scenario.trim()) {
      alert("Please enter a scenario");
      return;
    }

    try {
      setGenerating(true);
      const newTemplate = await generateMessageTemplate(generatorForm);
      setTemplates([newTemplate, ...templates]);
      setShowGenerator(false);
      setGeneratorForm({ scenario: "", recipientInfo: "", userInfo: "" });
    } catch (err) {
      console.error("Failed to generate template:", err);
      alert("Failed to generate template");
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-purple-600" />
            LinkedIn Message Templates
          </h1>
          <p className="text-gray-600 mt-2">
            Professional networking messages for every scenario
          </p>
        </div>

        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className="px-5 py-2.5 text-sm font-semibold text-white
                     bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg 
                     shadow hover:opacity-90 transition flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Generate Custom
        </button>
      </div>

      {/* AI Generator Modal */}
      {showGenerator && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            AI Message Generator
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scenario *
              </label>
              <input
                type="text"
                value={generatorForm.scenario}
                onChange={(e) =>
                  setGeneratorForm({ ...generatorForm, scenario: e.target.value })
                }
                placeholder="e.g., Requesting informational interview with a senior engineer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Info (Optional)
              </label>
              <input
                type="text"
                value={generatorForm.recipientInfo}
                onChange={(e) =>
                  setGeneratorForm({
                    ...generatorForm,
                    recipientInfo: e.target.value,
                  })
                }
                placeholder="e.g., Senior Software Engineer at Google, 10 years experience"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Background (Optional)
              </label>
              <input
                type="text"
                value={generatorForm.userInfo}
                onChange={(e) =>
                  setGeneratorForm({ ...generatorForm, userInfo: e.target.value })
                }
                placeholder="e.g., Recent CS grad, interested in backend development"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                           transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "Generating..." : "Generate Message"}
              </button>
              <button
                onClick={() => setShowGenerator(false)}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 
                           transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-6">
        {templates.map((template) => (
          <div
            key={template._id}
            className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {template.scenario.replace(/_/g, " ")}
                </h3>
                {template.customized && (
                  <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    AI Generated
                  </span>
                )}
              </div>

              <button
                onClick={() => copyToClipboard(template.template, template._id!)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 
                           rounded-lg hover:bg-blue-100 transition text-sm font-medium"
              >
                {copiedId === template._id ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans bg-gray-50 p-4 rounded-lg">
              {template.template}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}