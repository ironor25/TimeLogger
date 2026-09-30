'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import {
  Radio,
  RefreshCw,
  User,
  Monitor,
  CheckCircle2,
  Clock,
  Coffee,
  Maximize2,
  X,
  Activity,
  Layers,
} from 'lucide-react';

export default function MonitoringRoomPage() {
  const [selectedScreenshot, setSelectedScreenshot] = useState<any | null>(null);
  const [filterDepartment, setFilterDepartment] = useState('');

  // Fetch daily overview to get current presence and active session data
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['monitoring-overview'],
    queryFn: () => api.getDailyOverview(),
    refetchInterval: 15000, // Live poll every 15 seconds
  });

  // Fetch departments for filter
  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => api.getDepartments(),
  });

  // Also fetch latest screenshots to display live thumbnails
  const { data: latestScreenshots } = useQuery({
    queryKey: ['latest-monitoring-screenshots'],
    queryFn: () => api.getScreenshots({ limit: 40 }),
    refetchInterval: 20000,
  });

  const employees: any[] = overview?.employees || [];
  const metrics = overview?.metrics || {
    totalEmployees: 0,
    workingCount: 0,
    breakCount: 0,
    offlineCount: 0,
  };
  const screenshotsList: any[] = Array.isArray(latestScreenshots) ? latestScreenshots : (latestScreenshots?.data || []);

  // Map latest screenshot per employee
  const employeeLatestScreenshotMap = new Map<string, any>();
  screenshotsList.forEach((sc: any) => {
    if (sc.employeeId && !employeeLatestScreenshotMap.has(sc.employeeId)) {
      employeeLatestScreenshotMap.set(sc.employeeId, sc);
    }
  });

  const filteredEmployees = employees.filter((emp: any) => {
    if (filterDepartment && emp.department !== filterDepartment) return false;
    return true;
  });

  const activeEmployees = filteredEmployees.filter((emp: any) => emp.status === 'WORKING' || emp.status === 'ON_BREAK');
  const inactiveEmployees = filteredEmployees.filter((emp: any) => emp.status === 'OFFLINE');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Live Monitoring Room</h1>
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE 15s
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time bird's-eye view of currently active team members, tasks, and recent screen activity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
              >
                <option value="">All Departments</option>
                {departments?.map((d: any) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Now</p>
              <p className="text-xl font-bold text-emerald-600">{metrics.workingCount || 0}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">On Break</p>
              <p className="text-xl font-bold text-amber-600">{metrics.breakCount || 0}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Coffee className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Offline</p>
              <p className="text-xl font-bold text-slate-600">{metrics.offlineCount || 0}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <User className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Workforce</p>
              <p className="text-xl font-bold text-slate-900">{metrics.totalEmployees || 0}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Active Workforce Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Working Team Members</span>
              <span className="text-xs font-normal text-slate-500">({activeEmployees.length} online)</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Loading active monitoring feed...
            </div>
          ) : activeEmployees.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              No team members are currently clocked in.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeEmployees.map((emp: any) => {
                const latestSc = employeeLatestScreenshotMap.get(emp.id);
                const isBreak = emp.status === 'ON_BREAK';

                return (
                  <div
                    key={emp.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col hover:border-blue-400 transition-all hover:shadow-md"
                  >
                    {/* Header */}
                    <div className="p-3.5 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {emp.displayName?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900 leading-tight">{emp.displayName}</p>
                          <p className="text-[10px] text-slate-500">{emp.employeeCode} • {emp.department || 'General'}</p>
                        </div>
                      </div>

                      {isBreak ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Coffee className="w-3 h-3" />
                          Break
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      )}
                    </div>

                    {/* Screenshot Preview */}
                    <div
                      onClick={() => latestSc && setSelectedScreenshot(latestSc)}
                      className="aspect-video bg-slate-950 relative overflow-hidden group cursor-pointer"
                    >
                      {latestSc ? (
                        <>
                          <img
                            src={latestSc.fileUrl}
                            alt="Live Screen"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-[10px] text-white px-1.5 py-0.5 rounded font-mono">
                            {new Date(latestSc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1.5">
                          <Monitor className="w-6 h-6" />
                          <span className="text-[10px]">Awaiting screenshot capture</span>
                        </div>
                      )}
                    </div>

                    {/* Activity Stats Footer */}
                    <div className="p-3 bg-white space-y-2 text-xs flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Clocked in:</span>
                          <span className="font-semibold text-slate-700">
                            {emp.firstPunchIn ? new Date(emp.firstPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Total Today:</span>
                          <span className="font-semibold text-blue-600 font-mono">
                            {emp.formattedWorked || formatDuration(emp.todayWorkedSeconds || 0)}
                          </span>
                        </div>
                        {emp.activeSession?.project && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Project:</span>
                            <span className="font-medium text-slate-800 truncate max-w-[130px]">
                              {emp.activeSession.project.name}
                            </span>
                          </div>
                        )}

                        {latestSc && latestSc.activityPercentage !== null && latestSc.activityPercentage !== undefined && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-700 pt-1.5 border-t border-slate-100">
                            <span className="font-bold text-slate-600 shrink-0">Activity:</span>
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden flex min-w-[40px]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  latestSc.activityPercentage >= 50
                                    ? 'bg-[#22C55E]'
                                    : latestSc.activityPercentage >= 20
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, Math.round(latestSc.activityPercentage)))}%`,
                                }}
                              />
                            </div>
                            <span className="font-bold text-[10px] text-slate-700 shrink-0 font-mono">
                              {Math.round(latestSc.activityPercentage)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {emp.activeSession?.task && (
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                          <span className="text-slate-400">Task: </span>
                          <span className="font-medium truncate inline-block max-w-[180px] align-bottom">
                            {emp.activeSession.task.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Offline Roster Strip */}
        {inactiveEmployees.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Offline Team Members ({inactiveEmployees.length})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {inactiveEmployees.map((emp: any) => (
                <div
                  key={emp.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center gap-2 text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {emp.displayName?.[0] || 'U'}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-slate-700 truncate text-[11px]">{emp.displayName}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{emp.department || 'General'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Lightbox */}
        {selectedScreenshot && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 bg-slate-950 flex items-center justify-between text-white border-b border-slate-800">
                <div>
                  <h3 className="font-semibold text-sm">{selectedScreenshot.employee?.displayName}</h3>
                  <p className="text-[11px] text-slate-400">
                    Captured at: {new Date(selectedScreenshot.capturedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-black flex items-center justify-center max-h-[75vh] overflow-auto">
                <img
                  src={selectedScreenshot.fileUrl}
                  alt="Full Screenshot"
                  className="max-h-[70vh] w-auto object-contain rounded border border-slate-800"
                />
              </div>

              <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Resolution: {selectedScreenshot.width || 1920}x{selectedScreenshot.height || 1080}</span>
                <span className="font-semibold text-emerald-400">Activity Level: {selectedScreenshot.activityPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
