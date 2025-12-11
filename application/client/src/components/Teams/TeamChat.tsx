// src/components/Teams/TeamChat.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getTeamMessages,
  sendTeamMessage,
  type TeamChatMember,
  type TeamMessage,
} from "../../api/teams";

interface TeamChatProps {
  teamId: string;
}

type ChatTab = "team" | "direct";

interface DirectConversation {
  id: string; // conversation key
  label: string; // "User A, User B"
  participantIds: string[]; // without current user
}

// Build a stable key for a direct conversation, from the POV of the viewer
function buildDirectConversationKey(
  msg: TeamMessage,
  viewerId: string | null
): string | null {
  if (!viewerId) return null;
  if (msg.scope !== "direct") return null;

  const ids = new Set<string>();

  // ✅ include sender as a participant
  if (msg.senderId) {
    ids.add(msg.senderId);
  }

  // ✅ include all explicit recipients
  (msg.recipientIds || []).forEach((id) => {
    if (id) ids.add(id);
  });

  // ✅ ensure viewer is in the set (redundant but safe)
  ids.add(viewerId);

  const sorted = Array.from(ids).sort();
  if (sorted.length < 2) return null; // need at least viewer + someone else

  return sorted.join("|");
}

const TeamChat: React.FC<TeamChatProps> = ({ teamId }) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [members, setMembers] = useState<TeamChatMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ChatTab>("team");
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("new");

  const [text, setText] = useState("");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages
  useEffect(() => {
    if (!teamId) return;

    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);

        const res = await getTeamMessages(teamId);
        const msgs = (res?.messages || []) as TeamMessage[];
        const mems = (res?.members || []) as TeamChatMember[];

        // keep newest 50 overall
        const trimmed = msgs.slice(-50);

        setMessages(trimmed);
        setMembers(mems);
        setCurrentUserId(res.currentUserId ?? null);
      } catch (err: any) {
        console.error("Error loading messages:", err);
        setError(err?.message || "Failed to load messages.");
      } finally {
        setLoading(false);
      }
    }

    void loadMessages();
  }, [teamId]);

  // Separate team vs direct messages
  const teamMessages = useMemo(
    () => messages.filter((m) => !m.scope || m.scope === "team"),
    [messages]
  );

  const directMessages = useMemo(
    () => messages.filter((m) => m.scope === "direct"),
    [messages]
  );

  // Members except current user (for new direct chat picker)
  const recipientOptions = useMemo(
    () =>
      members.filter((m) => !currentUserId || m.id !== currentUserId),
    [members, currentUserId]
  );

  // Build conversation list from direct messages
  const directConversations: DirectConversation[] = useMemo(() => {
    if (!currentUserId) return [];

    const map = new Map<
      string,
      { id: string; participantIds: string[]; lastAt: number }
    >();

    directMessages.forEach((m) => {
      const key = buildDirectConversationKey(m, currentUserId);
      if (!key) return;

      const ids = key.split("|"); // includes currentUserId + others
      const participantIds = ids.filter((id) => id !== currentUserId);
      const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0;

      const existing = map.get(key);
      if (!existing || ts > existing.lastAt) {
        map.set(key, { id: key, participantIds, lastAt: ts });
      }
    });

    return Array.from(map.values())
      .map((conv) => {
        const names = conv.participantIds.map((id) => {
          const m = members.find((mem) => mem.id === id);
          return m?.name || m?.email || id;
        });
        return {
          id: conv.id,
          participantIds: conv.participantIds,
          label: names.length ? names.join(", ") : "Direct chat",
        };
      })
      // sort alphabetically by label
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [directMessages, members, currentUserId]);

  // Messages visible in current tab / conversation
  const visibleTeamMessages = teamMessages;

  const visibleDirectMessages = useMemo(() => {
    if (!currentUserId) return [];
    if (selectedConversationId === "new") {
      // new chat: no history yet
      return [];
    }
    return directMessages.filter(
      (m) =>
        buildDirectConversationKey(m, currentUserId) ===
        selectedConversationId
    );
  }, [directMessages, selectedConversationId, currentUserId]);

  const currentConversation = useMemo(() => {
    if (selectedConversationId === "new") return null;
    return (
      directConversations.find((c) => c.id === selectedConversationId) ||
      null
    );
  }, [selectedConversationId, directConversations]);

  // When switching tabs, reset / initialize some state
  useEffect(() => {
    if (activeTab === "team") {
      setSelectedConversationId("new");
      setRecipientIds([]);
    } else {
      // direct tab
      if (
        directConversations.length > 0 &&
        selectedConversationId === "new"
      ) {
        setSelectedConversationId(directConversations[0].id);
      }
    }
  }, [activeTab, directConversations, selectedConversationId]);

  // When the selected conversation changes, sync recipients (for existing chats)
  useEffect(() => {
    if (activeTab !== "direct") return;

    if (selectedConversationId === "new") {
      setRecipientIds([]);
      return;
    }

    const conv =
      directConversations.find((c) => c.id === selectedConversationId) ||
      null;
    if (conv) {
      setRecipientIds(conv.participantIds);
    }
  }, [activeTab, selectedConversationId, directConversations]);

  const handleToggleRecipient = (id: string, checked: boolean) => {
    setRecipientIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      setSending(true);
      setError(null);

      let payload:
        | { text: string; scope: "team"; recipientIds: string[] }
        | { text: string; scope: "direct"; recipientIds: string[] };

      if (activeTab === "team") {
        // Team broadcast
        payload = {
          text: trimmed,
          scope: "team",
          recipientIds: [],
        };
      } else {
        // Direct messages
        let actualRecipients: string[] = [];

        if (selectedConversationId === "new") {
          actualRecipients = recipientIds;
        } else if (currentConversation) {
          actualRecipients = currentConversation.participantIds;
        }

        if (!actualRecipients.length) {
          setError(
            "Please select at least one recipient for a direct message."
          );
          return;
        }

        payload = {
          text: trimmed,
          scope: "direct",
          recipientIds: actualRecipients,
        };
      }

      const res = await sendTeamMessage(teamId, payload);
      const newMsg = (res?.message || res) as TeamMessage;

      setMessages((prev) => {
        const next = [...prev, newMsg];
        return next.slice(-50);
      });

      // For newly created direct chats, snap to that conversation thread
      if (activeTab === "direct" && currentUserId) {
        const convKey = buildDirectConversationKey(newMsg, currentUserId);
        if (convKey) {
          setSelectedConversationId(convKey);
        }
      }

      setText("");
      if (activeTab === "team") {
        setRecipientIds([]);
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const getRecipientLabel = (msg: TeamMessage): string => {
    if (!msg.scope || msg.scope === "team" || !msg.recipientIds?.length) {
      return "Team";
    }

    const names =
      msg.recipientIds
        ?.map((rid) => {
          const m = members.find((mem) => mem.id === rid);
          return m?.name || m?.email || rid;
        })
        .filter(Boolean) || [];

    if (!names.length) return "Direct";
    return names.join(", ");
  };

  const renderMessages = (list: TeamMessage[], emptyText: string) => {
    if (loading) {
      return (
        <p className="text-sm text-gray-500">Loading messages…</p>
      );
    }

    return (
      <div className="max-h-64 overflow-y-auto border border-gray-100 p-2 mb-3 rounded">
        {list.length === 0 ? (
          <p className="text-xs text-gray-400">{emptyText}</p>
        ) : (
          list.map((m, i) => {
            const createdAt = m.createdAt
              ? new Date(m.createdAt).toLocaleString()
              : "";
            const toLabel = getRecipientLabel(m);

            return (
              <div
                key={m._id || i}
                className="mb-2 text-xs border-b border-gray-50 pb-1"
              >
                <p className="font-medium text-gray-800">
                  {m.senderName?.trim() ||
                    m.senderEmail ||
                    "Unknown sender"}
                  <span className="ml-1 text-[10px] text-gray-500">
                    {`→ ${toLabel}`}
                  </span>
                </p>
                <p className="text-gray-600">{m.text}</p>
                {createdAt && (
                  <p className="text-[10px] text-gray-400">
                    {createdAt}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const canSendDirect =
    activeTab === "direct" &&
    ((selectedConversationId === "new" && recipientIds.length > 0) ||
      (selectedConversationId !== "new" && !!currentConversation));

  return (
    <div className="bg-white shadow rounded-md p-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">
        Team Chat
      </h2>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-3 text-xs">
        <button
          type="button"
          className={`px-3 py-1 -mb-px border-b-2 ${
            activeTab === "team"
              ? "border-teal-600 text-teal-700 font-semibold"
              : "border-transparent text-gray-500"
          }`}
          onClick={() => setActiveTab("team")}
        >
          Team
        </button>
        <button
          type="button"
          className={`px-3 py-1 -mb-px border-b-2 ${
            activeTab === "direct"
              ? "border-teal-600 text-teal-700 font-semibold"
              : "border-transparent text-gray-500"
          }`}
          onClick={() => setActiveTab("direct")}
        >
          Direct
        </button>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}

      {/* TEAM TAB */}
      {activeTab === "team" && (
        <>
          {renderMessages(
            visibleTeamMessages,
            "No team messages yet."
          )}

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Type a team message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="bg-teal-600 text-white px-3 py-1 rounded text-sm disabled:opacity-60"
              onClick={handleSend}
              disabled={sending || !text.trim()}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </>
      )}

      {/* DIRECT TAB */}
      {activeTab === "direct" && (
        <>
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <label className="text-[11px] font-medium text-gray-700">
              Conversation
            </label>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-xs mt-1 sm:mt-0"
              value={selectedConversationId}
              onChange={(e) =>
                setSelectedConversationId(e.target.value)
              }
            >
              <option value="new">New direct chat</option>
              {directConversations.map((conv) => (
                <option key={conv.id} value={conv.id}>
                  {conv.label}
                </option>
              ))}
            </select>
          </div>

          {renderMessages(
            visibleDirectMessages,
            selectedConversationId === "new"
              ? "No direct messages yet. Start a new conversation."
              : "No messages yet in this conversation."
          )}

          {/* Participant picker / info */}
          {selectedConversationId === "new" ? (
            <div className="border border-gray-200 rounded p-2 mb-3">
              {recipientOptions.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  No other active team members found.
                </p>
              ) : (
                <>
                  <p className="text-[11px] text-gray-600 mb-1">
                    Choose one or more people:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recipientOptions.map((m) => {
                      const checked = recipientIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-1 text-[11px]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              handleToggleRecipient(
                                m.id,
                                e.target.checked
                              )
                            }
                          />
                          {m.name || m.email || m.id}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Direct messages are only visible to the sender and
                    selected recipients.
                  </p>
                </>
              )}
            </div>
          ) : currentConversation ? (
            <p className="mb-3 text-[11px] text-gray-600">
              Chat with:{" "}
              <span className="font-medium">
                {
                  directConversations.find(
                    (c) => c.id === selectedConversationId
                  )?.label
                }
              </span>
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Type a direct message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="bg-teal-600 text-white px-3 py-1 rounded text-sm disabled:opacity-60"
              onClick={handleSend}
              disabled={sending || !text.trim() || !canSendDirect}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamChat;
