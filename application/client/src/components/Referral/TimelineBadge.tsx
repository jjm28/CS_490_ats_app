import React from "react";
import {
  Clock,
  MessageSquare,
  Heart,
  CheckCircle,
  XCircle,
  SendHorizonal,
} from "lucide-react";

export default function TimelineBadge({ type }: { type: string }) {
  const key = type.toLowerCase();

  const variants: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    requested: {
      label: "Referral Requested",
      color: "bg-blue-100 text-blue-700",
      icon: <SendHorizonal size={14} className="mr-1" />,
    },

    followup: {
      label: "Follow-Up Added",
      color: "bg-yellow-100 text-yellow-700",
      icon: <Clock size={14} className="mr-1" />,
    },

    gratitude: {
      label: "Gratitude Sent",
      color: "bg-pink-100 text-pink-700",
      icon: <Heart size={14} className="mr-1" />,
    },

    status: {
      label: "Status Updated",
      color: "bg-purple-100 text-purple-700",
      icon: <MessageSquare size={14} className="mr-1" />,
    },

    completed: {
      label: "Referral Completed",
      color: "bg-green-100 text-green-700",
      icon: <CheckCircle size={14} className="mr-1" />,
    },

    declined: {
      label: "Referral Declined",
      color: "bg-red-100 text-red-700",
      icon: <XCircle size={14} className="mr-1" />,
    },
  };

  const variant =
    variants[key] || {
      label: type,
      color: "bg-gray-100 text-gray-700",
      icon: <MessageSquare size={14} className="mr-1" />,
    };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${variant.color}`}
    >
      {variant.icon}
      {variant.label}
    </span>
  );
}
