import { useState } from "react";

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToast(duration = 4000) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (
    message: string,
    options?: { actionLabel?: string; onAction?: () => void }
  ) => {
    setToast({
      message,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    });

    setTimeout(() => setToast(null), duration);
  };

  const Toast = () =>
    toast ? (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in">
        <span>{toast.message}</span>
        {toast.onAction && (
          <button
            onClick={() => {
              toast.onAction?.();
              setToast(null);
            }}
            className="text-blue-300 underline text-sm ml-2"
          >
            {toast.actionLabel || "Undo"}
          </button>
        )}
      </div>
    ) : null;

  return { showToast, Toast };
}