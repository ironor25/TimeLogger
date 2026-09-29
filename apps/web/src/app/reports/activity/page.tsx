'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import {
  TrendingUp,
  Activity,
  Calendar,
  Filter,
  Monitor,
  MousePointer,
  Keyboard,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function ActivityAnalyticsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [employeeId, setEmployeeId] = useState('');

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['activity-summary-report', { startDate, endDate, employeeId }],
    queryFn: () =>
      api.getActivitySummary({
        startDate,
        endDate,
        employeeId: employeeId || undefined,
      }),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const appBreakdown = activityData?.appBreakdown || [];
  const topWindows = activityData?.topWindows || [];
  const totalActiveSeconds = activityData?.totalActiveSeconds || 0;
  const totalIdleSeconds = activityData?.totalIdleSeconds || 0;
  const totalTrackedSeconds = totalActiveSeconds + totalIdleSeconds;
  const activePercentage = totalTrackedSeconds > 0 ? Math.round((totalActiveSeconds / totalTrackedSeconds) * 100) : 0;
  const idlePercentage = totalTrackedSeconds > 0 ? 100 - activePercentage : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Activity & Application Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Deep dive into application usage, active vs idle ratios, and desktop input dynamics
            </p>
          </div>

          {/* Date & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 text-xs"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
              >
                <option value="">All Employees</option>
                {employees?.data?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Top Ratio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Active vs Idle Ratio</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{activePercentage}% Active</span>
              <span className="text-xs font-semibold text-amber-600">{idlePercentage}% Idle</span>
            </div>
            {/* Split Bar */}
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${activePercentage}%` }} />
              <div className="bg-amber-400 h-full" style={{ width: `${idlePercentage}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1 font-mono">
              <span>{formatDuration(totalActiveSeconds)} Active</span>
              <span>{formatDuration(totalIdleSeconds)} Idle</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Tracked Work</span>
            <p className="text-2xl font-bold text-blue-600 font-mono mt-1">
              {formatDuration(totalTrackedSeconds)}
            </p>
            <p className="text-[11px] text-slate-500 pt-2">
              Across all recorded desktop activity heartbeats in this period
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Applications Audited</span>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {appBreakdown.length} Applications
            </p>
            <p className="text-[11px] text-slate-500 pt-2">
              Unique processes logged with window titles and active focus
            </p>
          </div>
        </div>

        {/* Application Breakdown & Window Titles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Applications */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-blue-600" />
                <span>Top Applications Used</span>
              </h2>
              <span className="text-[11px] text-slate-400">{appBreakdown.length} items</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading application analytics...</div>
            ) : appBreakdown.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No application usage recorded.</div>
            ) : (
              <div className="space-y-3.5">
                {appBreakdown.slice(0, 10).map((app: any, idx: number) => {
                  const percent = app.percentage || 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[220px]">
                          {app.appName || 'Unknown App'}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500">{formatDuration(app.seconds || 0)}</span>
                          <span className="font-bold text-blue-600 w-10 text-right">{percent}%</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Window Titles */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Active Window Titles & Tasks</span>
              </h2>
              <span className="text-[11px] text-slate-400">{topWindows.length} records</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading window activity...</div>
            ) : topWindows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No window titles recorded.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topWindows.slice(0, 8).map((w: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="truncate flex-1">
                      <p className="font-semibold text-slate-900 truncate">
                        {w.windowTitle || 'Desktop Workspace'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        App: {w.appName || 'System'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-blue-600">
                        {formatDuration(w.seconds || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
