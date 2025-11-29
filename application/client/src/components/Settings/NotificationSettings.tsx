// ============================================
// FILE: frontend/src/components/Settings/NotificationSettings.tsx
// ============================================
// User interface for managing notification preferences

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import API_BASE from "../../utils/apiBase";

interface NotificationPreferences {
  email: {
    enabled: boolean;
    types: {
      approaching: boolean;
      dayBefore: boolean;
      dayOf: boolean;
      overdue: boolean;
    };
    approachingDays: number;
  };
  inApp: {
    enabled: boolean;
    types: {
      approaching: boolean;
      dayBefore: boolean;
      dayOf: boolean;
      overdue: boolean;
    };
  };
}

function NotificationSettings() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testingSend, setTestingSend] = useState(false);

  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/notifications/preferences`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else {
        setError("Failed to load notification preferences");
      }
    } catch (err) {
      console.error("Error fetching preferences:", err);
      setError("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/notifications/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setFlash("Notification preferences saved!");
        setTimeout(() => setFlash(null), 3000);
      } else {
        setError("Failed to save preferences");
      }
    } catch (err) {
      console.error("Error saving preferences:", err);
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTestingSend(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/notifications/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setFlash("Test notification sent! Check your email.");
        setTimeout(() => setFlash(null), 5000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to send test notification");
      }
    } catch (err) {
      console.error("Error sending test:", err);
      setError("Failed to send test notification");
    } finally {
      setTestingSend(false);
    }
  };

  const updatePreference = (path: string, value: any) => {
    if (!preferences) return;

    const keys = path.split('.');
    const newPreferences = JSON.parse(JSON.stringify(preferences));
    
    let current: any = newPreferences;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setPreferences(newPreferences);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-red-600">Failed to load preferences</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Notification Settings
        </h1>
        <p className="text-gray-600">
          Manage how and when you receive deadline reminders
        </p>
      </div>

      {flash && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
          {flash}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {/* Email Notifications */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          📧 Email Notifications
        </h2>

        <div className="space-y-4">
          {/* Master Toggle */}
          <label className="flex items-center gap-3 p-3 rounded border hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.email.enabled}
              onChange={(e) => updatePreference('email.enabled', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Enable Email Notifications</div>
              <div className="text-sm text-gray-600">
                Receive deadline reminders via email
              </div>
            </div>
          </label>

          {preferences.email.enabled && (
            <div className="ml-8 space-y-3 pt-3 border-t">
              {/* Approaching Deadline */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email.types.approaching}
                  onChange={(e) => updatePreference('email.types.approaching', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Approaching deadline reminder</span>
              </label>

              {preferences.email.types.approaching && (
                <div className="ml-7 flex items-center gap-2 text-sm text-gray-600">
                  <span>Notify me</span>
                  <input
                    type="number"
                    value={preferences.email.approachingDays}
                    onChange={(e) => updatePreference('email.approachingDays', parseInt(e.target.value))}
                    min="1"
                    max="30"
                    className="w-16 px-2 py-1 border border-gray-300 rounded"
                  />
                  <span>days before deadline</span>
                </div>
              )}

              {/* Day Before */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email.types.dayBefore}
                  onChange={(e) => updatePreference('email.types.dayBefore', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Day before deadline</span>
              </label>

              {/* Day Of */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email.types.dayOf}
                  onChange={(e) => updatePreference('email.types.dayOf', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Day of deadline (morning)</span>
              </label>

              {/* Overdue */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email.types.overdue}
                  onChange={(e) => updatePreference('email.types.overdue', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Overdue reminders (daily)</span>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* In-App Notifications */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          🔔 In-App Notifications
        </h2>

        <div className="space-y-4">
          {/* Master Toggle */}
          <label className="flex items-center gap-3 p-3 rounded border hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.inApp.enabled}
              onChange={(e) => updatePreference('inApp.enabled', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Enable In-App Notifications</div>
              <div className="text-sm text-gray-600">
                Show deadline alerts when you visit the app
              </div>
            </div>
          </label>

          {preferences.inApp.enabled && (
            <div className="ml-8 space-y-3 pt-3 border-t">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.inApp.types.approaching}
                  onChange={(e) => updatePreference('inApp.types.approaching', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Approaching deadline</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.inApp.types.dayBefore}
                  onChange={(e) => updatePreference('inApp.types.dayBefore', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Day before deadline</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.inApp.types.dayOf}
                  onChange={(e) => updatePreference('inApp.types.dayOf', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Day of deadline</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.inApp.types.overdue}
                  onChange={(e) => updatePreference('inApp.types.overdue', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700">Overdue reminders</span>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Test Notification */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          🧪 Test Notifications
        </h2>
        <p className="text-gray-600 mb-4">
          Send yourself a test notification to see what they look like
        </p>
        <Button
          onClick={handleTestNotification}
          variant="secondary"
          disabled={testingSend || !preferences.email.enabled}
        >
          {testingSend ? "Sending..." : "Send Test Email"}
        </Button>
        {!preferences.email.enabled && (
          <p className="text-sm text-amber-600 mt-2">
            Enable email notifications first to test
          </p>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

export default NotificationSettings;