import React, { useState } from "react";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import type {
  PeerOpportunity,
  PeerOpportunityStats,
  PeerOpportunityInterest,
  OpportunityInterestEntry,
  PeerGroupMembership,
} from "../../../api/peerGroups";
import { fetchOpportunityInterests } from "../../../api/peerGroups";

type OpportunityCardProps = {
  opportunity: PeerOpportunity;
  stats: PeerOpportunityStats | { interestCount: number; referredCount: number };
  membership: PeerGroupMembership | null;
  myInterest: PeerOpportunityInterest | null;
  isOwner: boolean; // whether current user is the referrer / group owner
  onExpressInterest: (op: PeerOpportunity, note: string) => void;
  onWithdrawInterest: (op: PeerOpportunity) => void;
  onAddToTracker?: (op: PeerOpportunity) => void;
};

export default function OpportunityCard({
  opportunity: opp,
  stats,
  membership,
  myInterest,
  isOwner,
  onExpressInterest,
  onWithdrawInterest,
  onAddToTracker,
}: OpportunityCardProps) {
  const [note, setNote] = useState("");
  const [showInterested, setShowInterested] = useState(false);
  const [interestedEntries, setInterestedEntries] = useState<
    OpportunityInterestEntry[]
  >([]);
  const [loadingInterested, setLoadingInterested] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const currentUserId = JSON.parse(localStorage.getItem("authUser") ?? "").user._id

  const isInterested = !!myInterest && myInterest.status !== "withdrawn";

  const handleToggleInterestedList = async () => {
    if (!showInterested) {
      try {
        setLoadingInterested(true);
        setError(null);
        const entries = await fetchOpportunityInterests(opp._id,currentUserId);
        console.log( "dsf",entries)
        setInterestedEntries(entries);
      } catch (e) {
        console.error(e);
        setError("Failed to load interested candidates.");
      } finally {
        setLoadingInterested(false);
      }
    }
    setShowInterested((prev) => !prev);
  };

  const isOpen = opp.status === "open";

  return (
    <Card className="p-3 space-y-2">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">
              {opp.title} @ {opp.company}
            </h3>
            {!isOpen && (
              <span className="text-[10px] uppercase bg-gray-100 border rounded px-1.5 py-0.5 text-gray-500">
                {opp.status}
              </span>
            )}
            {opp.referralAvailable && (
              <span className="text-[10px] uppercase bg-green-100 border border-green-200 rounded px-1.5 py-0.5 text-green-700">
                Referral available
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600">
            {opp.location && <span>{opp.location} · </span>}
            {opp.source && <span>{opp.source}</span>}
          </p>
          {opp.tags && opp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {opp.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-gray-100 rounded-full px-2 py-0.5 text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {opp.notes && (
            <p className="text-xs text-gray-700 mt-1">{opp.notes}</p>
          )}
        </div>

        <div className="text-[11px] text-gray-500 text-right">
          <div>{stats.interestCount} interested</div>
          <div>{stats.referredCount} referred</div>
          {opp.maxReferrals > 0 && (
            <div>Max {opp.maxReferrals} referrals</div>
          )}
        </div>
      </div>

      {/* Link + primary actions */}
      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
        {opp.jobUrl && (
          <a
            href={opp.jobUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-600"
          >
            View job posting
          </a>
        )}
        {onAddToTracker && (
          <button
            type="button"
            className="underline text-gray-700"
            onClick={() => onAddToTracker(opp)}
          >
            Add to my job tracker
          </button>
        )}
      </div>

      {/* Interest actions */}
      {membership ? (
        <div className="mt-2 space-y-2">
          {isOpen ? (
            <>
              {!isInterested ? (
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-600">
                    Interested? Send a short note to the referrer:
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs flex-1"
                      placeholder="Optional note (e.g. resume summary, focus area)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        onExpressInterest(opp, note);
                        setNote("");
                      }}
                    >
                      I&apos;m interested
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-gray-700">
                    You&apos;ve expressed interest. Status:{" "}
                    <span className="font-medium">{myInterest?.status}</span>
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onWithdrawInterest(opp)}
                  >
                    Withdraw
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px] text-gray-500">
              This opportunity is no longer open.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 mt-1">
          Join this group to express interest in shared opportunities.
        </p>
      )}

      {/* Interested candidates (for referrer / owner) */}
      {isOwner && (
        <div className="mt-3 border-t pt-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-gray-700">
              Interested candidates
            </span>
            <button
              type="button"
              className="text-[11px] underline text-gray-500"
              onClick={handleToggleInterestedList}
            >
              {showInterested ? "Hide" : "View"}
            </button>
          </div>
          {showInterested && (
            <div className="mt-1 space-y-1">
              {loadingInterested && (
                <p className="text-[11px] text-gray-500">
                  Loading interested candidates...
                </p>
              )}
              {error && (
                <p className="text-[11px] text-red-600">{error}</p>
              )}
           {!loadingInterested && (!interestedEntries || interestedEntries.length === 0) && (
                  <p className="text-[11px] text-gray-500">
                    No one has expressed interest yet.
                  </p>
                )}
              {interestedEntries.map((entry) => (
                <div
                  key={entry._id}
                  className="border rounded px-2 py-1 text-[11px] flex justify-between gap-2"
                >
                  <div>
                    <div className="font-medium">
                      {entry.persona.displayName}
                      {entry.persona.mode !== "public" && (
                        <span className="text-[10px] text-gray-500 ml-1">
                          ({entry.persona.mode})
                        </span>
                      )}
                    </div>
                    {entry.persona.headline && (
                      <div className="text-[10px] text-gray-500">
                        {entry.persona.headline}
                      </div>
                    )}
                    {entry.note && (
                      <div className="text-[11px] text-gray-700 mt-0.5">
                        {entry.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-gray-500">
                    <div>Status: {entry.status}</div>
                    <div>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
