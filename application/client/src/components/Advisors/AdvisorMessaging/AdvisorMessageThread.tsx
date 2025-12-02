// components/AdvisorMessaging/AdvisorMessageThread.tsx
import React, { useEffect, useRef, useState } from "react";
import API_BASE from "../../../utils/apiBase";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import type { AdvisorMessage } from "../../../types/advisors.types";

interface AdvisorMessageThreadProps {
  relationshipId: string;
  role: "candidate" | "advisor";
  currentUserId: string;
}

export default function AdvisorMessageThread({
  relationshipId,
  role,
  currentUserId,
}: AdvisorMessageThreadProps) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors/clients/${relationshipId}/messages?role=${encodeURIComponent(
            role
          )}&userId=${encodeURIComponent(currentUserId)}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load messages"
          );
        }

        const data = (await res.json()) as AdvisorMessage[];
        setMessages(data);
        setTimeout(scrollToBottom, 50);
      } catch (err: any) {
        console.error("Error loading messages:", err);
        setError(err.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    if (relationshipId && currentUserId) {
      fetchMessages();
    }
  }, [relationshipId, currentUserId, role]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/advisors/clients/${relationshipId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role,
            userId: currentUserId,
            body: trimmed,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || "Failed to send message"
        );
      }

      const newMsg = (await res.json()) as AdvisorMessage;
      setMessages((prev) => [...prev, newMsg]);
      setInput("");
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[70vh] max-h-[70vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-sm">Loading chat...</p>}
        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && messages.length === 0 && (
          <p className="text-sm text-gray-500">
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((msg) => {
          const isMine =
            (role === "candidate" &&
              msg.senderRole === "candidate") ||
            (role === "advisor" &&
              msg.senderRole === "advisor");

          return (
            <div
              key={msg.id}
              className={`flex ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  isMine
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {msg.body}
                </p>
                <p className="mt-1 text-[10px] opacity-70 text-right">
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="border-t px-4 py-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-3 py-2 text-sm resize-none max-h-24"
          placeholder="Type a message..."
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          {sending ? "Sending..." : "Send"}
        </Button>
      </form>
    </Card>
  );
}
