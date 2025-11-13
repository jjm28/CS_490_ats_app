import { useState, useCallback } from "react";

export interface Notification {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: Notification["type"] = "info") => {
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3500); // auto-dismiss after 3.5s
    },
    []
  );

  return { notifications, addNotification };
}