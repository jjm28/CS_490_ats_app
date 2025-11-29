import React, { useState } from "react";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import {
  type GroupChallenge,
  type GroupChallengeStats,
  type PeerGroupMembership,
  type GroupChallengeParticipation,
  type ChallengeLeaderboardEntry,
  fetchChallengeLeaderboard,
} from "../../../api/peerGroups";

type ChallengeCardProps = {
  challenge: GroupChallenge;
  stats: GroupChallengeStats | { participantCount: number; totalProgress: number };
  membership: PeerGroupMembership | null;
  myParticipation: GroupChallengeParticipation | null;
  onJoin: (challenge: GroupChallenge) => void;
  onUpdateProgress: (
    challenge: GroupChallenge,
    delta: number,
    note?: string
  ) => void;
  onLeave: (challenge: GroupChallenge) => void;
};

export default function ChallengeCard({
  challenge: ch,
  stats,
  membership,
  myParticipation: myPart,
  onJoin,
  onUpdateProgress,
  onLeave,
}: ChallengeCardProps) {
  const [deltaValue, setDeltaValue] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
    const currentUserId = JSON.parse(localStorage.getItem("authUser") ?? "").user._id

  const myProgress = myPart?.progressValue || 0;
  const target = ch.targetValue || 1;
  const pct = Math.min(100, Math.round((myProgress / target) * 100));

  const handleLoadLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      setLeaderboardError(null);
      const entries = await fetchChallengeLeaderboard(ch._id,currentUserId);
      console.log(entries)
      setLeaderboard(entries);
    } catch (e) {
      console.error(e);
      setLeaderboardError("Failed to load leaderboard.");
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  return (
    <Card className="p-3 space-y-2">
      {/* Header + stats */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{ch.title}</h3>
            {!ch.isActive && (
              <span className="text-[10px] uppercase bg-gray-100 border rounded px-1.5 py-0.5 text-gray-500">
                Ended
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600">
            {new Date(ch.startDate).toLocaleDateString()} –{" "}
            {new Date(ch.endDate).toLocaleDateString()} · Goal:{" "}
            {ch.targetValue} {ch.unitLabel}
          </p>
          {ch.description && (
            <p className="text-xs text-gray-700 mt-1">{ch.description}</p>
          )}
        </div>
        <div className="text-[11px] text-gray-500 text-right">
          <div>{stats.participantCount} participants</div>
          <div>
            Group total: {stats.totalProgress} {ch.unitLabel}
          </div>
        </div>
      </div>

      {/* Participation / progress */}
      {membership ? (
        <div className="space-y-1">
          {myPart ? (
            <>
              <p className="text-xs text-gray-700">
                Your progress: {myProgress} / {ch.targetValue} {ch.unitLabel} ({pct}
                %)
              </p>
              <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
                <div
                  className="bg-gray-700 h-2"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={1}
                  className="border rounded px-2 py-1 text-xs w-24"
                  placeholder="+2"
                  value={deltaValue}
                  onChange={(e) => setDeltaValue(e.target.value)}
                />
                <input
                  type="text"
                  className="border rounded px-2 py-1 text-xs flex-1"
                  placeholder="Optional note (e.g. companies you applied to)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onUpdateProgress(
                        ch,
                        Number(deltaValue || 0),
                        (e.target as HTMLInputElement).value
                      );
                      setDeltaValue("");
                    }
                  }}
                  onBlur={(e) => {
                    if (!deltaValue) return;
                    onUpdateProgress(
                      ch,
                      Number(deltaValue || 0),
                      e.target.value
                    );
                    setDeltaValue("");
                  }}
                />

                <Button
                  type="button"
                  disabled={!deltaValue}
                  onClick={() => {
                    onUpdateProgress(ch, Number(deltaValue), undefined);
                    setDeltaValue("");
                  }}
                >
                  Add
                </Button>

                <Button type="button" onClick={() => onLeave(ch)}>
                  Leave
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-600">
                You haven&apos;t joined this challenge yet.
              </p>
              <Button type="button" onClick={() => onJoin(ch)}>
                Join challenge
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-500">
          Join this group to participate in challenges.
        </p>
      )}

      {/* Leaderboard */}
      <div className="mt-3 border-t pt-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-gray-700">
            Top participants
          </span>
          <button
            type="button"
            className="text-[11px] underline text-gray-500"
            onClick={handleLoadLeaderboard}
          >
            {loadingLeaderboard ? "Loading..." : "Refresh"}
          </button>
        </div>

        {leaderboardError && (
          <p className="text-[11px] text-red-600 mt-1">{leaderboardError}</p>
        )}

        <div className="mt-1 space-y-1">
          {leaderboard.length > 0 ? (
            leaderboard.slice(0, 3).map((entry, idx) => (
              <div
                key={entry.userId + idx}
                className="flex justify-between text-[11px] text-gray-700"
              >
                <span>
                  {idx + 1}. {entry.persona.displayName}
                  {entry.persona.mode !== "public" && (
                    <span className="text-[10px] text-gray-500 ml-1">
                      ({entry.persona.mode})
                    </span>
                  )}
                </span>
                <span>
                  {entry.progressValue} {ch.unitLabel}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-gray-500">
              No leaderboard data yet. Start updating progress to appear here.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
