import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLinkedInProfile, type LinkedInProfile } from "../../../api/linkedin";
import { Linkedin, MessageSquare, UserPlus, TrendingUp, FileText, Target } from "lucide-react";

export default function LinkedInTools() {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await getLinkedInProfile();
      setProfile(data);
      console.log("Loaded LinkedIn profile:", data);
    } catch (err) {
      console.error("Failed to load LinkedIn profile:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-600 animate-pulse">
        Loading LinkedIn tools...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-gradient-to-r from-[#0A66C2] to-[#004182] 
                   rounded-lg shadow hover:opacity-90 transition"
      >
        ← Back to Network Dashboard
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Linkedin className="w-8 h-8 text-[#0A66C2]" />
          LinkedIn Networking Tools
        </h1>
        <p className="text-gray-600 mt-2">
          Optimize your LinkedIn presence and supercharge your networking
        </p>
      </div>

      {/* Profile Overview */}
      {profile ? (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-4">
            {profile.photoUrl && (
              <img
                src={profile.photoUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full border-2 border-blue-500"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-gray-700">{profile.headline || "No headline set"}</p>
              {profile.linkedInProfileUrl && (
                <a
                  href={profile.linkedInProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View LinkedIn Profile →
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-gray-700">
            No LinkedIn account connected. 
            <a href="/login" className="text-blue-600 hover:underline ml-1">
              Sign in with LinkedIn
            </a> to access these tools.
          </p>
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ToolCard
          title="Message Templates"
          description="Generate personalized networking messages for any scenario"
          icon={<MessageSquare className="w-8 h-8 text-purple-600" />}
          link="/networking/linkedin/messages"
        />

        <ToolCard
          title="Connection Requests"
          description="Craft effective connection request messages"
          icon={<UserPlus className="w-8 h-8 text-green-600" />}
          link="/networking/linkedin/connections"
        />

        <ToolCard
          title="Profile Optimization"
          description="Get AI-powered suggestions to improve your profile"
          icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
          link="/networking/linkedin/optimize"
        />

        <ToolCard
          title="Content Strategy"
          description="Learn what to post and when for maximum engagement"
          icon={<FileText className="w-8 h-8 text-orange-600" />}
          link="/networking/linkedin/content"
        />

        <ToolCard
          title="Campaign Templates"
          description="Structured networking campaigns for specific goals"
          icon={<Target className="w-8 h-8 text-indigo-600" />}
          link="/networking/linkedin/campaigns"
        />
      </div>
    </div>
  );
}

/* Tool Card Component */
function ToolCard({ title, description, icon, link }: any) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(link)}
      className="group p-6 rounded-xl border border-gray-200 bg-white/70 backdrop-blur 
                 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 bg-gray-100 rounded-xl group-hover:scale-110 transition">
          {icon}
        </div>
      </div>

      <h2 className="font-semibold text-xl text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 text-sm">{description}</p>

      <div className="mt-4 text-blue-600 font-medium text-sm flex items-center gap-1">
        Explore →
      </div>
    </div>
  );
}