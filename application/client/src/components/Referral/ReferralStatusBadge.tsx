export type ReferralStatus = "pending" | "followup" | "completed" | "declined";

const colors: Record<ReferralStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  followup: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

export default function ReferralStatusBadge({
  status,
}: {
  status: ReferralStatus;
}) {
  return (
    <span className={`px-3 py-1 rounded-full text-sm ${colors[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}
