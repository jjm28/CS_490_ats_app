// InAppNotifications.tsx
import React, { useState, useEffect } from "react";
// Assuming you have API_BASE defined in your utilities like in JobUrlImporter
import API_BASE from "../../utils/apiBase"; 

// Configuration
// Define the specific endpoint for fetching unread in-app notifications
const NOTIFICATIONS_ENDPOINT = `${API_BASE}/api/notifications`; 

// Define a type for the notification structure for better clarity
interface Notification {
  _id: string;
  type: 'approaching' | 'dayBefore' | 'dayOf' | 'overdue';
  job: {
    _id: string;
    jobTitle: string;
    company: string;
    applicationDeadline: string; // Date string
  };
  // Includes other fields from NotificationLogSchema
}

function InAppNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // State to handle the transition logic for dismissing notifications
  const [dismissingIds, setDismissingIds] = useState<string[]>([]);
  
  // NOTE: You would typically also want a `loading` and `error` state here.
  // We'll keep it minimal for now, focusing on the fetching logic.

  /**
   * Fetches unread in-app notifications from the API following the standard fetch pattern.
   */
  const checkForNotifications = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";

      // Fetch unread notifications for the 'inApp' channel
      const response = await fetch(`${NOTIFICATIONS_ENDPOINT}/in-app/unread`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle error response (e.g., unauthorized, server error)
        console.error("Failed to fetch notifications:", result.error || "Unknown API Error");
        return;
      }
      
      // Assuming result.data contains the array of Notification objects
      setNotifications(result.data);
      
    } catch (error) {
      // Handle network errors
      console.error("Network error fetching notifications:", error);
    }
  };

  /**
   * Marks a notification as 'read' and starts the dismissal animation.
   * @param id The MongoDB _id of the NotificationLog entry.
   */
  const dismissNotification = async (id: string) => {
    setDismissingIds(prev => [...prev, id]);

    // Give time for the CSS animation to run (e.g., 300ms)
    setTimeout(async () => {
      try {
        const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
        
        // API call to update the NotificationLog status/readAt field using PUT
        const response = await fetch(`${NOTIFICATIONS_ENDPOINT}/log/${id}/read`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to mark as read");
        }
        
        // Remove from the local state after API confirms read
        setNotifications(prev => prev.filter(n => n._id !== id));
      } catch (error) {
        console.error("Error dismissing notification:", error);
        // If API fails, stop dismissing animation and leave it visible
        setDismissingIds(prev => prev.filter(dId => dId !== id));
      }
    }, 300);
  };
  
  // --- Polling Setup ---
  useEffect(() => {
    checkForNotifications();
    // Check every minute for new notifications
    const interval = setInterval(checkForNotifications, 60000); 
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this runs once on mount

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => {
        const isDismissing = dismissingIds.includes(notification._id);
        const deadlineDate = new Date(notification.job.applicationDeadline).toLocaleDateString();
        
        // Determine link based on job ID
        const jobUrl = `/jobs/${notification.job._id}`;

        return (
          <a
            href={jobUrl}
            onClick={(e) => {
              // Dismiss immediately when clicked, but let the link navigate
              // We dismiss here to prevent the API call from being blocked
              // and ensure the notification doesn't reappear on refresh right away.
              e.preventDefault(); 
              dismissNotification(notification._id);
              // Navigate after a short delay to allow dismissal CSS to start
              setTimeout(() => {
                window.location.href = jobUrl;
              }, 100); 
            }}
            key={notification._id}
            // Use a class that handles the fade-out/slide-out effect when dismissing
            className={`
              block bg-white rounded-lg shadow-lg p-4 cursor-pointer
              border-l-4 border-l-orange-500 
              transition-all duration-300 ease-in-out hover:shadow-xl
              ${isDismissing ? 'opacity-0 transform translate-x-full' : 'animate-slide-in'}
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {notification.job.jobTitle}
                </div>
                <div className="text-sm text-gray-600">
                  {notification.job.company}
                </div>
                <div className="text-sm text-orange-700 mt-1">
                  Deadline: {deadlineDate}
                </div>
              </div>
              <button
                // Stop propagation so clicking the X doesn't trigger the <a> tag navigation
                onClick={(e) => { e.stopPropagation(); dismissNotification(notification._id); }}
                className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default InAppNotifications;