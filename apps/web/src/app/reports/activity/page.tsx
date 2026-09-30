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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Activity & Application Analytics</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              Deep dive into application usage, active vs idle ratios, and desktop input dynamics
            </p>
          </div>

          {/* Date & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#f4f4f4] border border-[#e0e0e0] px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#525252]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent focus:outline-none text-[#161616] text-xs font-mono tracking-carbon"
              />
              <span className="text-[#8c8c8c]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent focus:outline-none text-[#161616] text-xs font-mono tracking-carbon"
              />
            </div>

            <div className="bg-[#f4f4f4] border border-[#e0e0e0] px-3 py-1.5 text-xs">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
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
          <div className="p-4 bg-white border border-[#e0e0e0] space-y-2">
            <span className="text-[11px] font-semibold text-[#525252] uppercase tracking-carbon">Active vs Idle Ratio</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-light text-[#161616]">{activePercentage}% Active</span>
              <span className="text-xs font-semibold text-[#6d4f00]">{idlePercentage}% Idle</span>
            </div>
            {/* Split Bar */}
            <div className="h-2 w-full bg-[#e0e0e0] overflow-hidden flex">
              <div className="bg-[#24a148] h-full" style={{ width: `${activePercentage}%` }} />
              <div className="bg-[#f1c21b] h-full" style={{ width: `${idlePercentage}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-[#525252] pt-1 font-mono tracking-carbon">
              <span>{formatDuration(totalActiveSeconds)} Active</span>
              <span>{formatDuration(totalIdleSeconds)} Idle</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#e0e0e0] space-y-1">
            <span className="text-[11px] font-semibold text-[#525252] uppercase tracking-carbon">Total Tracked Work</span>
            <p className="text-2xl font-light text-[#0f62fe] font-mono mt-1">
              {formatDuration(totalTrackedSeconds)}
            </p>
            <p className="text-[11px] text-[#525252] pt-2 tracking-carbon">
              Across all recorded desktop activity heartbeats in this period
            </p>
          </div>

          <div className="p-4 bg-white border border-[#e0e0e0] space-y-1">
            <span className="text-[11px] font-semibold text-[#525252] uppercase tracking-carbon">Applications Audited</span>
            <p className="text-2xl font-light text-[#161616] mt-1">
              {appBreakdown.length} Applications
            </p>
            <p className="text-[11px] text-[#525252] pt-2 tracking-carbon">
              Unique processes logged with window titles and active focus
            </p>
          </div>
        </div>

        {/* Application Breakdown & Window Titles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Applications */}
          <div className="bg-white border border-[#e0e0e0] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h2 className="text-xs font-semibold text-[#161616] uppercase tracking-carbon flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-[#0f62fe]" />
                <span>Top Applications Used</span>
              </h2>
              <span className="text-[11px] text-[#8c8c8c] font-mono">{appBreakdown.length} items</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading application analytics...</div>
            ) : appBreakdown.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8c8c8c] tracking-carbon">No application usage recorded.</div>
            ) : (
              <div className="space-y-3.5">
                {appBreakdown.slice(0, 10).map((app: any, idx: number) => {
                  const percent = app.percentage || 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs tracking-carbon">
                        <span className="font-semibold text-[#161616] truncate max-w-[220px]">
                          {app.appName || 'Unknown App'}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[#525252]">{formatDuration(app.seconds || 0)}</span>
                          <span className="font-semibold text-[#0f62fe] w-10 text-right">{percent}%</span>
                        </div>
                      </div>

                      <div className="w-full bg-[#e0e0e0] h-1.5 overflow-hidden">
                        <div
                          className="bg-[#0f62fe] h-full transition-all"
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
          <div className="bg-white border border-[#e0e0e0] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h2 className="text-xs font-semibold text-[#161616] uppercase tracking-carbon flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0f62fe]" />
                <span>Active Window Titles & Tasks</span>
              </h2>
              <span className="text-[11px] text-[#8c8c8c] font-mono">{topWindows.length} records</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading window activity...</div>
            ) : topWindows.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8c8c8c] tracking-carbon">No window titles recorded.</div>
            ) : (
              <div className="divide-y divide-[#e0e0e0]">
                {topWindows.slice(0, 8).map((w: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs tracking-carbon hover:bg-[#f4f4f4] transition-colors px-1">
                    <div className="truncate flex-1">
                      <p className="font-semibold text-[#161616] truncate">
                        {w.windowTitle || 'Desktop Workspace'}
                      </p>
                      <p className="text-[11px] text-[#525252] truncate mt-0.5">
                        App: {w.appName || 'System'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-[#0f62fe]">
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
