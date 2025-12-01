import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  DiscussionMessage,
  DiscussionReactionType,
} from "../../api/jobSearchSharing";
import {
  fetchDiscussionMessages,
  postDiscussionMessageApi,
  reactToDiscussionMessageApi,
} from "../../api/jobSearchSharing";

interface Props {
  ownerUserId: string;   // whose discussion thread
  currentUserId: string; // who is posting/viewing
}

type ContextType = "general" | "goal" | "milestone" | "report";



export default function JobSearchDiscussionPanel({
  ownerUserId,
  currentUserId,
}: Props) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [contextType, setContextType] = useState<ContextType>("general");
  const [contextId, setContextId] = useState<string>("");

  const ownerId = currentUserId; // for now, owner == viewer on this page

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDiscussionMessages(ownerUserId, currentUserId, 50);
        
        if (!mounted) return;
        setMessages(data);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Error loading discussion messages");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [ownerId, currentUserId]);

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      setError(null);
      const msg = await postDiscussionMessageApi({
        ownerUserId: ownerId,
        senderUserId: currentUserId,
        text: trimmed,
        contextType,
        contextId: contextId || undefined,
      });

      // prepend new message
      setMessages((prev) => [msg, ...prev]);
      setText("");
      setContextType("general");
      setContextId("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error posting message");
    }
  };

  const handleReaction = async (
    messageId: string,
    type: DiscussionReactionType
  ) => {
    try {
      const updated = await reactToDiscussionMessageApi({
        messageId,
        userId: currentUserId,
        type,
      });

      setMessages((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m))
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error reacting to message");
    }
  };

  const countReactions = (msg: DiscussionMessage, type: DiscussionReactionType) =>
    msg.reactions.filter((r) => r.type === type).length;

  const hasUserReaction = (
    msg: DiscussionMessage,
    type: DiscussionReactionType
  ) => msg.reactions.some((r) => r.type === type && r.userId === currentUserId);

  const renderContextLabel = (msg: DiscussionMessage) => {
    if (!msg.contextType || msg.contextType === "general") return null;
    let label = "";
    if (msg.contextType === "goal") label = "Goal";
    if (msg.contextType === "milestone") label = "Milestone";
    if (msg.contextType === "report") label = "Report";
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]">
        Linked to: {label}
      </span>
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <Card className="p-4 space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Discussion & Check-ins</h2>
          <p className="text-sm text-gray-600">
            Share updates and encourage each other around your job search progress.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Composer */}
      <div className="border rounded-md p-3 bg-gray-50 space-y-2">
        <textarea
          className="w-full border rounded px-2 py-1 text-sm resize-none"
          rows={3}
          placeholder="Share an update or ask for support…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-gray-600">Context:</label>
            <select
              className="border rounded px-2 py-1 text-xs"
              value={contextType}
              onChange={(e) =>
                setContextType(e.target.value as ContextType)
              }
            >
              <option value="general">General</option>
              <option value="goal">Goal</option>
              <option value="milestone">Milestone</option>
              <option value="report">Report</option>
            </select>
            {contextType !== "general" && (
              <input
                className="border rounded px-2 py-1 text-xs"
                placeholder={`${contextType} id (optional)`}
                value={contextId}
                onChange={(e) => setContextId(e.target.value)}
              />
            )}
          </div>
          <Button type="button" onClick={handlePost}>
            Post
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {loading && <p className="text-sm">Loading discussion…</p>}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-500">
            No messages yet. Start the conversation with a quick update or question.
          </p>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderUserId === currentUserId;
          return (
            <div
              key={msg._id}
              className={`border rounded-md p-2 text-xs ${
                isMine ? "bg-white" : "bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-700">
                  {isMine ? "You" : "Partner"}
                </span>
                <span className="text-[10px] text-gray-500">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-line mb-1">
                {msg.text}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderContextLabel(msg)}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  {(["thumbs_up", "celebrate", "fire"] as DiscussionReactionType[]).map(
                    (type) => {
                      const count = countReactions(msg, type);
                      const active = hasUserReaction(msg, type);
                      const label =
                        type === "thumbs_up"
                          ? "👍"
                          : type === "celebrate"
                          ? "🎉"
                          : "🔥";
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleReaction(msg._id, type)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${
                            active
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-white border-gray-200 text-gray-600"
                          }`}
                        >
                          <span>{label}</span>
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
