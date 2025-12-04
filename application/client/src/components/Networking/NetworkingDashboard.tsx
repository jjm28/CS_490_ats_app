import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getContacts } from "../../api/contact";
import type { Contact } from "../../api/contact";

import {
  getContactsNeedingAttention,
  getUpcomingReminders,
} from "../../api/relationship";
import { AlertCircle, Clock, Newspaper, Target } from "lucide-react";

import API_BASE from "../../utils/apiBase";
import axios from "axios";


import {
  UserPlus,
  MessageSquare,
  PhoneCall,
  Users,
  Bell,
  Star,
  Calendar,
  BarChart2,
} from "lucide-react";

export default function NetworkingDashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);


  const [needsAttention, setNeedsAttention] = useState<Contact[]>([]);
  const [upcomingRemindersFromAPI, setUpcomingRemindersFromAPI] = useState<
    Contact[]
  >([]);


 
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState<any[]>([]);
const [loadingSuggestions, setLoadingSuggestions] = useState(false);

async function fetchSuggestions() {
  try {
    setLoadingSuggestions(true);
    const token = JSON.parse(localStorage.getItem("authUser")!).token;

    const res = await axios.get(`/api/networking/suggestions`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setSuggestions(res.data.suggestions || []);
  } catch (err) {
    console.error("Failed to fetch suggestions", err);
  } finally {
    setLoadingSuggestions(false);
  }
}

async function handleConnect(suggestion: any) {
  const raw = localStorage.getItem("authUser");
  const auth = raw ? JSON.parse(raw) : null;

  const token = auth?.token;
  const userId = auth?.user?._id;

  if (!token || !userId) {
    console.error("Missing authentication.");
    alert("Auth error — please log in again.");
    return;
  }

  const body = {
    userid: userId,
    name: suggestion.name,
    jobTitle: suggestion.role,
    company: suggestion.company,
    email: suggestion.email,
    relationshipStrength: 50,
  };

  console.log("POST body:", body);

  try {
    const res = await fetch(`${API_BASE}/api/networking/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to add");

    // 🧹 Remove from suggestions instantly
    setSuggestions((prev: any[]) =>
      prev.filter((c) => c._id !== suggestion._id)
    );

    // 📈 Track networking success analytics
await fetch(`${API_BASE}/api/networking/track-connect`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
});


    alert(`Successfully added ${suggestion.name}!`);

  } catch (err) {
    console.error("Add contact failed:", err);
    alert("Failed to add contact.");
  }
}



useEffect(() => {
  fetchSuggestions();
}, []);

  useEffect(() => {
    async function load() {
      try {
        const [contactsData, attentionData, remindersData] = await Promise.all([
          getContacts(),
          getContactsNeedingAttention(),
          getUpcomingReminders(),
        ]);
        setContacts(contactsData);
        setNeedsAttention(attentionData);
        setUpcomingRemindersFromAPI(remindersData);
      } catch {
        setContacts([]);
        setNeedsAttention([]);
        setUpcomingRemindersFromAPI([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="text-center mt-20 text-gray-600 animate-pulse">
        Loading networking dashboard…
      </div>
    );

  const upcomingReminders = contacts.filter((c) => c.reminderDate);
  const strongestContacts = [...contacts]
    .sort((a, b) => b.relationshipStrength! - a.relationshipStrength!)
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* PAGE TITLE */}
      <h1 className="text-center text-4xl font-extrabold text-gray-900 mb-12">
        Professional Network Dashboard
      </h1>

      {/* PREMIUM QUICK ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <PremiumCard
          title="Manage Contacts"
          description="View and organize your professional connections."
          icon={<Users className="w-8 h-8 text-blue-600" />}
          link="/networking/contacts"
        />

        <PremiumCard
          title="AI Outreach Generator"
          description="Craft personalized outreach messages instantly."
          icon={<MessageSquare className="w-8 h-8 text-purple-600" />}
          link="/networking/outreach"
        />

        <PremiumCard
          title="Informational Interviews"
          description="Request interviews, prepare effectively, and track outcomes."
          icon={<span className="text-3xl">🎙️</span>}
          link="/networking/informational"
        />

        <PremiumCard
            title="Mentorship & Coaching"
            description="View mentor access, permissions, and collaboration insights."
            icon={<span className="text-3xl">🧑‍🏫</span>}
            link="/networking/mentors"
          />


        <PremiumCard
          title="Interaction History"
          description="Track calls, meetings, referrals & more."
          icon={<PhoneCall className="w-8 h-8 text-emerald-600" />}
          link="/networking/interactions"
        />

        {/* ⭐ NEW — NETWORKING EVENTS CARD */}
        <PremiumCard
          title="Networking Events & Opportunities"
          description="Track events, goals, connections, and follow-ups."
          icon={<Calendar className="w-8 h-8 text-pink-600" />}
          link="/networking/events"
        />

        <PremiumCard
          title="Discover Events"
          description="Find relevant networking opportunities near you."
          icon={<Calendar className="w-8 h-8 text-teal-600" />}
          link="/networking/discover"
        />

        <PremiumCard
          title="Networking Analytics"
          description="Track your networking performance, ROI, and relationship-building progress."
          icon={<BarChart2 className="w-8 h-8 text-teal-600" />}
          link="/networking/analytics"
        />



      </div>

      {/* -------------------------------------------
           ⭐ REFERRAL TOOLS SECTION
         -------------------------------------------- */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        Referral Tools
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <PremiumCard
          title="Request a Referral"
          description="Generate personalized referral requests."
          icon={<UserPlus className="w-8 h-8 text-green-600" />}
          link="/referrals/request"
        />

        <PremiumCard
          title="Referral Dashboard"
          description="Track status, outcomes, and follow-up timing."
          icon={<Star className="w-8 h-8 text-yellow-500" />}
          link="/referrals"
        />

        <PremiumCard
          title="Referral Insights"
          description="Analyze referral success and best connections."
          icon={<Bell className="w-8 h-8 text-orange-500" />}
          link="/referrals/insights"
        />

        
      </div>

      {/* STRONGEST RELATIONSHIPS */}
      <SectionHeader
        title="Strongest Relationships"
        icon={<Star className="w-6 h-6 text-amber-500" />}
      />

      <div className="space-y-4 max-w-4xl mx-auto mb-16">
        {strongestContacts.map((c) => (
          <RelationshipCard key={c._id} contact={c} />
        ))}
      </div>

{/* -------------------------------------------
     ⭐ SUGGESTED CONTACTS SECTION
   -------------------------------------------- */}
<SectionHeader
  title="Suggested Contacts"
  icon={<Users className="w-6 h-6 text-blue-600" />}
/>

<div className="space-y-4 max-w-4xl mx-auto mb-16">
  {loadingSuggestions && (
    <p className="text-center text-gray-500">Loading suggestions...</p>
  )}

  {!loadingSuggestions && suggestions.length === 0 && (
    <p className="text-center text-gray-400 text-sm italic">
      No recommended new contacts found yet.
    </p>
  )}

  {suggestions.map((c: any) => (
    <div
      key={c._id}
      className="flex justify-between items-center p-5 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all"
    >
      <div>
        <p className="font-semibold text-gray-900 text-lg">{c.name}</p>
        <p className="text-gray-600 text-sm">
          {c.role || "Unknown role"} @ {c.company || "Unknown company"}
        </p>

        {/* MATCH TAGS */}
        {c.match_reason?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {c.match_reason.map((reason: string, idx: number) => (
              <span
                key={idx}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium shadow-sm"
              >
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => handleConnect(c)}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Connect
      </button>
    </div>
  ))}
</div>


      {/* REMINDERS */}
      <SectionHeader
        title="Upcoming Reminders"
        icon={<Bell className="w-6 h-6 text-red-500" />}
      />

      <div className="space-y-4 max-w-4xl mx-auto">
        {upcomingReminders.length === 0 ? (
          <p className="text-center text-gray-500 italic">
            No upcoming reminders
          </p>
        ) : (
          upcomingReminders.map((c) => <ReminderCard key={c._id} contact={c} />)
        )}
      </div>

      {/* CONTACTS NEEDING ATTENTION - NEW */}
      {needsAttention.length > 0 && (
        <>
          <SectionHeader
            title="Contacts Needing Attention"
            icon={<AlertCircle className="w-6 h-6 text-orange-500" />}
          />

          <div className="space-y-4 max-w-4xl mx-auto mb-16">
            {needsAttention.slice(0, 5).map((c) => (
              <ContactNeedsAttentionCard key={c._id} contact={c} />
            ))}
            {needsAttention.length > 5 && (
              <Link
                to="/networking/contacts"
                className="block text-center text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all {needsAttention.length} contacts →
              </Link>
            )}
          </div>
        </>
      )}

      {/* UPCOMING CHECK-INS FROM API - NEW */}
      {upcomingRemindersFromAPI.length > 0 && (
        <>
          <SectionHeader
            title="Upcoming Check-ins"
            icon={<Clock className="w-6 h-6 text-blue-500" />}
          />

          <div className="space-y-4 max-w-4xl mx-auto mb-16">
            {upcomingRemindersFromAPI.slice(0, 5).map((c) => (
              <UpcomingReminderCard key={c._id} contact={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------
   ⭐ PREMIUM CARD COMPONENT
-------------------------------------------- */
function PremiumCard({ title, description, icon, link }: any) {
  return (
    <Link
      to={link}
      className="
        group p-7 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur 
        shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300
      "
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 bg-gray-100 rounded-xl group-hover:scale-110 transition">
          {icon}
        </div>
        <h2 className="font-semibold text-xl text-gray-800">{title}</h2>
      </div>

      <p className="text-gray-600 text-sm">{description}</p>
    </Link>
  );
}

/* -------------------------------------------
   ⭐ SECTION TITLE COMPONENT
-------------------------------------------- */
function SectionHeader({ title, icon }: any) {
  return (
    <div className="flex justify-center items-center gap-3 mb-6">
      {icon}
      <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

/* -------------------------------------------
   ⭐ RELATIONSHIP CARD
-------------------------------------------- */
function RelationshipCard({ contact }: { contact: Contact }) {
  return (
    <div
      className="
        flex justify-between items-center p-5 bg-white shadow-sm border rounded-xl
        hover:shadow-md transition-all
      "
    >
      <div>
        <p className="font-semibold text-gray-900 text-lg">{contact.name}</p>
        <p className="text-gray-600 text-sm">
          {contact.jobTitle || "Unknown role"} @{" "}
          {contact.company || "Unknown company"}
        </p>
      </div>

      <p className="text-xl font-bold text-emerald-700">
        {contact.relationshipStrength}/100
      </p>
    </div>
  );
}

/* -------------------------------------------
   ⭐ REMINDER CARD
-------------------------------------------- */
function ReminderCard({ contact }: { contact: Contact }) {
  return (
    <div
      className="
        flex justify-between items-center p-5 bg-yellow-50 border border-yellow-200 
        rounded-xl shadow-sm hover:shadow transition
      "
    >
      <div>
        <p className="font-semibold text-gray-900">{contact.name}</p>
        <p className="text-gray-600 text-sm">Reach out soon</p>
      </div>

      <p className="font-medium text-gray-700">
        {new Date(contact.reminderDate!).toLocaleDateString()}
      </p>
    </div>
  );
}

/* -------------------------------------------
   ⭐ CONTACT NEEDS ATTENTION CARD
-------------------------------------------- */
function ContactNeedsAttentionCard({ contact }: { contact: Contact }) {
  const navigate = useNavigate();

  const healthColors = {
    needs_attention: "bg-yellow-50 border-yellow-200",
    at_risk: "bg-red-50 border-red-200",
  };

  const healthText = {
    needs_attention: "Needs Attention",
    at_risk: "At Risk",
  };

  const healthTextColor = {
    needs_attention: "text-yellow-800",
    at_risk: "text-red-800",
  };

  return (
    <div
      className={`
        flex justify-between items-center p-5 border rounded-xl
        shadow-sm hover:shadow-md transition-all cursor-pointer
        ${
          healthColors[
            contact.relationshipHealth as keyof typeof healthColors
          ] || "bg-gray-50 border-gray-200"
        }
      `}
      onClick={() => navigate(`/networking/contacts/${contact._id}`)}
    >
      <div>
        <p className="font-semibold text-gray-900 text-lg">{contact.name}</p>
        <p className="text-gray-600 text-sm">
          {contact.jobTitle || "Unknown role"} @{" "}
          {contact.company || "Unknown company"}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span
            className={`text-sm font-medium ${
              healthTextColor[
                contact.relationshipHealth as keyof typeof healthTextColor
              ]
            }`}
          >
            {healthText[contact.relationshipHealth as keyof typeof healthText]}
          </span>
          <span className="text-sm text-gray-500">
            Last contact: {contact.daysSinceLastContact || 0} days ago
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/networking/contacts/${contact._id}/outreach`);
        }}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
                   hover:bg-emerald-700 transition text-sm font-medium"
      >
        Reach Out
      </button>
    </div>
  );
}

/* -------------------------------------------
   ⭐ UPCOMING REMINDER CARD
-------------------------------------------- */
function UpcomingReminderCard({ contact }: { contact: Contact }) {
  const navigate = useNavigate();

  const reminderDate = contact.reminderDate
    ? new Date(contact.reminderDate)
    : contact.nextSuggestedContact
    ? new Date(contact.nextSuggestedContact)
    : null;

  const daysUntil = reminderDate
    ? Math.ceil(
        (reminderDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div
      className="
        flex justify-between items-center p-5 bg-blue-50 border border-blue-200 
        rounded-xl shadow-sm hover:shadow-md transition cursor-pointer
      "
      onClick={() => navigate(`/networking/contacts/${contact._id}`)}
    >
      <div>
        <p className="font-semibold text-gray-900 text-lg">{contact.name}</p>
        <p className="text-gray-600 text-sm">
          {contact.jobTitle || "Unknown role"} @{" "}
          {contact.company || "Unknown company"}
        </p>
        <p className="text-sm text-blue-700 mt-1">
          {daysUntil !== null && daysUntil === 0 && "Reach out today"}
          {daysUntil !== null && daysUntil === 1 && "Reach out tomorrow"}
          {daysUntil !== null &&
            daysUntil > 1 &&
            `Reach out in ${daysUntil} days`}
          {daysUntil !== null &&
            daysUntil < 0 &&
            `Overdue by ${Math.abs(daysUntil)} days`}
        </p>
      </div>

      <div className="text-right">
        {reminderDate && (
          <p className="font-medium text-gray-700">
            {reminderDate.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
