// src/components/Support/SupportPage.tsx
import React, { useState } from "react";
import Card from "../StyledComponents/Card";
import SupporterSettings from "./SupporterSettings";
import WellbeingCheckinPanel from "./WellbeingCheckinPanel";
import WellbeingSupportPanel from "./WellbeingSupportPanel";
import MySupportedPeople from "./MySupportedPeople";

interface Props {
  userId: string;
}

type SupportTab = "network" | "wellbeing" | "supporting";

export default function SupportPage({ userId }: Props) {
  const [activeTab, setActiveTab] = useState<SupportTab>("network");

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      {/* SIMPLE HEADER – no card, centered */}
      <header className="text-center space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
          Support hub
        </h1>
        <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto">
          Bring your trusted people into your job search in a healthy way:
          set boundaries, share wins, and track your well-being over time.
        </p>
      </header>

      {/* SMALLER, COMPACT TABS */}
      <nav className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-white border shadow-sm px-1 py-1">
          <TabChip
            label="My support network"
            isActive={activeTab === "network"}
            onClick={() => setActiveTab("network")}
          />
          <TabChip
            label="My well-being"
            isActive={activeTab === "wellbeing"}
            onClick={() => setActiveTab("wellbeing")}
          />
          <TabChip
            label="People I support"
            isActive={activeTab === "supporting"}
            onClick={() => setActiveTab("supporting")}
          />
        </div>
      </nav>

      {/* TAB CONTENT */}
      <section>
        {activeTab === "network" && (
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            <div className="space-y-4">
              <SupporterSettings userId={userId} />
            </div>
            <div className="space-y-4">
              <WellbeingCheckinPanel userId={userId} />
            </div>
          </div>
        )}

        {activeTab === "wellbeing" && (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
            <div className="space-y-4">
              <WellbeingSupportPanel userId={userId} />
            </div>
            <div className="space-y-4">
              <WellbeingCheckinPanel userId={userId} />
            </div>
          </div>
        )}

        {activeTab === "supporting" && (
          <div className="space-y-4">
            <MySupportedPeople />
          </div>
        )}
      </section>
    </div>
  );
}

function TabChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1 rounded-full text-[11px] md:text-xs font-medium transition " +
        (isActive
          ? "bg-blue-600 text-white"
          : "bg-transparent text-slate-700 hover:bg-slate-100")
      }
    >
      {label}
    </button>
  );
}
