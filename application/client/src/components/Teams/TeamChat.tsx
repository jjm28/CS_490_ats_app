// src/components/Teams/TeamChat.tsx
import React, { useEffect, useState } from "react";
import { getTeamMessages, sendTeamMessage } from "../../api/teams";

interface TeamChatProps {
  teamId: string;
}

const TeamChat: React.FC<TeamChatProps> = ({ teamId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 /* useEffect(() => {
    loadMessages();
  }, [teamId]); */

  useEffect(() => {
  if (!teamId) return;

  async function loadMessages() {
    try {
      setLoading(true);
      setError(null);

      const res = await getTeamMessages(teamId);
      setMessages(res.messages || res || []); // handle either shape
    } catch (err: any) {
      console.error("Error loading messages:", err);
      setError(err?.message || "Failed to load messages.");
    } finally {
      setLoading(false); // ✅ always stop the spinner
    }
  }

  loadMessages();
}, [teamId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await getTeamMessages(teamId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      const res = await sendTeamMessage(teamId, text);
      setMessages((prev) => [...prev, res.message]);
      setText("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="bg-white shadow rounded-md p-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">
        Mentor ↔ Mentee Messages
      </h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading messages…</p>
      ) : (
        <div className="h-64 overflow-y-auto border border-gray-100 p-2 mb-3 rounded">
          {messages.length === 0 ? (
            <p className="text-xs text-gray-400">No messages yet.</p>
          ) : (
            messages.map((m, i) => (
              <div
                key={m._id || i}
                className="mb-2 text-xs border-b border-gray-50 pb-1"
              >
                <p className="font-medium text-gray-800">{m.senderName?.trim() || m.senderEmail || m.senderId}</p>
                <p className="text-gray-600">{m.text}</p>
                <p className="text-[10px] text-gray-400">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="Type your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="bg-teal-600 text-white px-3 py-1 rounded text-sm"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default TeamChat;
