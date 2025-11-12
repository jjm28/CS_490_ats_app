import { useState } from "react";

export function useToast(duration = 4000) {
  const [toast, setToast] = useState<{ message: string; action?: () => void } | null>(null);

  const showToast = (message: string, action?: () => void) => {
    setToast({ message, action });
    setTimeout(() => setToast(null), duration);
  };

  const Toast = () =>
    toast ? (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in">
        <span>{toast.message}</span>
        {toast.action && (
          <button
            onClick={toast.action}
          className="text-blue-300 underline text-sm ml-2"
          >
            Undo
          </button>
        )}
      </div>
    ) : null;

  return { showToast, Toast };
}