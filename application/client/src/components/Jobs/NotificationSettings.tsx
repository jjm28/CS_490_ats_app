// NotificationSettings.tsx
import React, { useState, useEffect } from "react";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";

interface NotificationPreferences {
  email: {
    enabled: boolean;
    types: {
      approaching: boolean;
      dayBefore: boolean;
      dayOf: boolean;
      overdue: boolean;
      weeklyDigest: boolean;
    };
    approachingDays: number;
    digestDay: string;
    digestTime: string;
  };
  push: {
    enabled: boolean;
    types: {
      approaching: boolean;
      dayBefore: boolean;
      dayOf: boolean;
      overdue: boolean;
    };
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
  timezone: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    // Fetch from API
  };

  const handleSave = async () => {
    // Save to API
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Notification Settings
      </h1>
      <p className="text-gray-600 mb-6">
        Manage how and when you receive deadline reminders
      </p>

      {/* Email Notifications */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences?.email.enabled}
              onChange={(e) => {
                // Update state
              }}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">Enable Email Notifications</div>
              <div className="text-sm text-gray-600">
                Receive deadline reminders via email
              </div>
            </div>
          </label>

          {preferences?.email.enabled && (
            <div className="ml-8 space-y-3 pt-3 border-t">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Approaching deadline (customizable days)</span>
              </label>
              
              <div className="ml-7">
                <label className="text-sm text-gray-600">
                  Notify me
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={preferences.email.approachingDays}
                    className="mx-2 w-16 px-2 py-1 border rounded"
                  />
                  days before deadline
                </label>
              </div>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Day before deadline</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Day of deadline (morning)</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Overdue reminders (daily)</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span>Weekly digest</span>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Push Notifications */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
        {/* Similar structure */}
      </Card>

      {/* Quiet Hours */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Quiet Hours</h2>
        {/* Time picker for start/end */}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

export default NotificationSettings;