'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  Building2,
  Save,
  ShieldCheck,
  Camera,
  Clock,
  CheckCircle2,
  Sliders,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function CompanySettingsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [screenshotInterval, setScreenshotInterval] = useState(5);
  const [blurScreenshots, setBlurScreenshots] = useState(false);
  const [allowDeleteScreenshots, setAllowDeleteScreenshots] = useState(false);
  const [idleThreshold, setIdleThreshold] = useState(5);
  const [requireTask, setRequireTask] = useState(false);
  const [allowManualTime, setAllowManualTime] = useState(true);
  const [strictSchedule, setStrictSchedule] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.getSettings(),
  });

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setTimezone(settings.timezone || 'UTC');
      setCurrency(settings.currency || 'USD');
      setScreenshotInterval(settings.screenshotIntervalMinutes || 5);
      setBlurScreenshots(Boolean(settings.blurScreenshots));
      setAllowDeleteScreenshots(Boolean(settings.allowScreenshotDelete));
      setIdleThreshold(settings.idleThresholdMinutes || 5);
      setRequireTask(Boolean(settings.requireTaskSelection));
      setAllowManualTime(Boolean(settings.allowManualTime));
      setStrictSchedule(Boolean(settings.strictScheduleEnforcement));
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      timezone,
      currency,
      screenshotIntervalMinutes: Number(screenshotInterval),
      blurScreenshots,
      allowScreenshotDelete: allowDeleteScreenshots,
      idleThresholdMinutes: Number(idleThreshold),
      requireTaskSelection: requireTask,
      allowManualTime,
      strictScheduleEnforcement: strictSchedule,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organization Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure tenant profile, screenshot capture policies, and time tracking rules
            </p>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-xs text-slate-400">
            Loading organization configuration...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Profile */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Company Identity & Locale
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-700">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Primary Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">America/New_York (EST / EDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
                    <option value="America/Chicago">America/Chicago (CST / CDT)</option>
                    <option value="Europe/London">Europe/London (GMT / BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET / CEST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Billing Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="CAD">CAD ($ - Canadian Dollar)</option>
                    <option value="AUD">AUD ($ - Australian Dollar)</option>
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Monitoring & Screenshot Capture Policies */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Camera className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Desktop Screen Capture & Privacy
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Screenshot Frequency (Minutes)
                  </label>
                  <select
                    value={screenshotInterval}
                    onChange={(e) => setScreenshotInterval(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={3}>Every 3 minutes (High Frequency)</option>
                    <option value={5}>Every 5 minutes (Recommended Standard)</option>
                    <option value={10}>Every 10 minutes</option>
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Idle Detection Threshold (Minutes)
                  </label>
                  <select
                    value={idleThreshold}
                    onChange={(e) => setIdleThreshold(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={2}>2 minutes</option>
                    <option value={3}>3 minutes</option>
                    <option value={5}>5 minutes (Recommended)</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Screenshot Blurring (Privacy Shield)</p>
                    <p className="text-[11px] text-slate-500">
                      Apply a light privacy blur filter over captured screenshots to obfuscate sensitive passwords or personal messages.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={blurScreenshots}
                    onChange={(e) => setBlurScreenshots(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Allow Screenshot Deletion by Employees</p>
                    <p className="text-[11px] text-slate-500">
                      When enabled, employees may delete their own accidental personal screen captures (deducting the corresponding interval time).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDeleteScreenshots}
                    onChange={(e) => setAllowDeleteScreenshots(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Time Tracking & Schedule Rules */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tracking Rules & Approvals
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Require Task Selection</p>
                    <p className="text-[11px] text-slate-500">
                      Force employees to select an active project task before starting a tracking session on the desktop agent.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireTask}
                    onChange={(e) => setRequireTask(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Allow Manual Time Logging</p>
                    <p className="text-[11px] text-slate-500">
                      Permit staff to submit offline / manual work logs subject to managerial review.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowManualTime}
                    onChange={(e) => setAllowManualTime(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Strict Shift Schedule Enforcement</p>
                    <p className="text-[11px] text-slate-500">
                      Flag punches outside assigned shift hours as attendance anomalies and alert managers.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={strictSchedule}
                    onChange={(e) => setStrictSchedule(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            {hasPermission('settings.edit') && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{updateMutation.isPending ? 'Saving...' : 'Save Organization Settings'}</span>
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </AppLayout>
  );
}
