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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-light text-[#161616] tracking-tight">Live Monitoring Room</h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-normal px-2.5 py-0.5 rounded-none bg-[#defbe6] text-[#0e6027] border border-[#a7f0ba] tracking-carbon">
                <span className="w-1.5 h-1.5 bg-[#24a148]"></span>
                LIVE (15s)
              </span>
            </div>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              Real-time bird&apos;s-eye view of currently active team members, tasks, and recent screen activity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-[#e0e0e0] bg-[#f4f4f4] hover:bg-[#e0e0e0] text-[#161616] text-xs font-normal transition-colors tracking-carbon"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#525252] ${isRefetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none flex items-center justify-between">
            <div>
              <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">Active Now</p>
              <p className="text-2xl font-light text-[#24a148] mt-1">{metrics.workingCount || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#defbe6] border border-[#a7f0ba] flex items-center justify-center text-[#0e6027] rounded-none">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none flex items-center justify-between">
            <div>
              <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">On Break</p>
              <p className="text-2xl font-light text-[#6d4f00] mt-1">{metrics.breakCount || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#fdf2cc] border border-[#fbe499] flex items-center justify-center text-[#6d4f00] rounded-none">
              <Coffee className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none flex items-center justify-between">
            <div>
              <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">Offline</p>
              <p className="text-2xl font-light text-[#525252] mt-1">{metrics.offlineCount || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#f4f4f4] border border-[#e0e0e0] flex items-center justify-center text-[#525252] rounded-none">
              <User className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none flex items-center justify-between">
            <div>
              <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">Total Workforce</p>
              <p className="text-2xl font-light text-[#161616] mt-1">{metrics.totalEmployees || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#edf5ff] border border-[#a6c8ff] flex items-center justify-center text-[#0f62fe] rounded-none">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Active Workforce Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#161616] flex items-center gap-2">
              <span>Working Team Members</span>
              <span className="text-xs font-normal text-[#525252]">({activeEmployees.length} online)</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="bg-white border border-[#e0e0e0] rounded-none p-12 text-center text-xs text-[#8c8c8c] tracking-carbon">
              Loading active monitoring feed...
            </div>
          ) : activeEmployees.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-none p-12 text-center text-[#525252] text-xs tracking-carbon">
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
                    className="bg-white border border-[#e0e0e0] rounded-none overflow-hidden flex flex-col hover:border-[#0f62fe] transition-all"
                  >
                    {/* Header */}
                    <div className="p-3.5 border-b border-[#e0e0e0] flex items-start justify-between bg-[#f4f4f4]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#edf5ff] border border-[#a6c8ff] text-[#0f62fe] font-medium text-xs flex items-center justify-center rounded-none">
                          {emp.displayName?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-xs text-[#161616] leading-tight">{emp.displayName}</p>
                          <p className="text-[10px] text-[#8c8c8c]">{emp.employeeCode} • {emp.department || 'General'}</p>
                        </div>
                      </div>

                      {isBreak ? (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-none bg-[#fdf2cc] text-[#6d4f00] border border-[#fbe499] flex items-center gap-1">
                          <Coffee className="w-3 h-3" />
                          Break
                        </span>
                      ) : (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-none bg-[#defbe6] text-[#0e6027] border border-[#a7f0ba] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#24a148]"></span>
                          Active
                        </span>
                      )}
                    </div>

                    {/* Screenshot Preview */}
                    <div
                      onClick={() => latestSc && setSelectedScreenshot(latestSc)}
                      className="aspect-video bg-[#161616] relative overflow-hidden group cursor-pointer"
                    >
                      {latestSc ? (
                        <>
                          <img
                            src={latestSc.fileUrl}
                            alt="Live Screen"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-[#161616]/0 group-hover:bg-[#161616]/30 transition-colors flex items-center justify-center">
                            <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 bg-[#161616]/80 text-[10px] text-white px-1.5 py-0.5 rounded-none font-mono">
                            {new Date(latestSc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#525252] gap-1.5">
                          <Monitor className="w-6 h-6" />
                          <span className="text-[10px] tracking-carbon">Awaiting screen capture</span>
                        </div>
                      )}
                    </div>

                    {/* Activity Stats Footer */}
                    <div className="p-3 bg-white space-y-2 text-xs flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[#525252]">
                          <span>Clocked in:</span>
                          <span className="font-medium text-[#161616]">
                            {emp.firstPunchIn ? new Date(emp.firstPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#525252]">
                          <span>Total Today:</span>
                          <span className="font-medium text-[#0f62fe] font-mono">
                            {emp.formattedWorked || formatDuration(emp.todayWorkedSeconds || 0)}
                          </span>
                        </div>
                        {emp.activeSession?.project && (
                          <div className="flex items-center justify-between text-[11px] text-[#525252]">
                            <span>Project:</span>
                            <span className="font-medium text-[#161616] truncate max-w-[130px]">
                              {emp.activeSession.project.name}
                            </span>
                          </div>
                        )}

                        {latestSc && latestSc.activityPercentage !== null && latestSc.activityPercentage !== undefined && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#525252] pt-1.5 border-t border-[#e0e0e0]">
                            <span className="font-medium text-[#161616] shrink-0">Activity:</span>
                            <div className="flex-1 h-2 bg-[#e0e0e0] rounded-none overflow-hidden flex min-w-[40px]">
                              <div
                                className={`h-full rounded-none transition-all ${
                                  latestSc.activityPercentage >= 50
                                    ? 'bg-[#24a148]'
                                    : latestSc.activityPercentage >= 20
                                    ? 'bg-[#f1c21b]'
                                    : 'bg-[#da1e28]'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, Math.round(latestSc.activityPercentage)))}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-[#525252] shrink-0">
                              {Math.round(latestSc.activityPercentage)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {emp.activeSession?.task && (
                        <div className="pt-2 border-t border-[#e0e0e0] text-[11px] text-[#525252]">
                          <span className="text-[#8c8c8c]">Task: </span>
                          <span className="font-medium text-[#161616] truncate inline-block max-w-[180px] align-bottom">
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
          <div className="bg-white border border-[#e0e0e0] rounded-none p-4 space-y-3">
            <h3 className="text-xs font-normal text-[#525252] uppercase tracking-wider">
              Offline Team Members ({inactiveEmployees.length})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {inactiveEmployees.map((emp: any) => (
                <div
                  key={emp.id}
                  className="p-2.5 rounded-none border border-[#e0e0e0] bg-[#f4f4f4] flex items-center gap-2 text-xs"
                >
                  <div className="w-6 h-6 rounded-none bg-[#e0e0e0] text-[#525252] font-medium text-[10px] flex items-center justify-center shrink-0">
                    {emp.displayName?.[0] || 'U'}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-[#161616] truncate text-[11px]">{emp.displayName}</p>
                    <p className="text-[10px] text-[#8c8c8c] capitalize">{emp.department || 'General'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Lightbox */}
        {selectedScreenshot && (
          <div className="fixed inset-0 bg-[#161616]/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#161616] rounded-none border border-[#262626] max-w-4xl w-full overflow-hidden flex flex-col">
              <div className="p-4 bg-[#161616] flex items-center justify-between text-white border-b border-[#262626]">
                <div>
                  <h3 className="font-medium text-sm text-white">{selectedScreenshot.employee?.displayName}</h3>
                  <p className="text-[11px] text-[#8c8c8c] tracking-carbon">
                    Captured at: {new Date(selectedScreenshot.capturedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="p-1.5 rounded-none text-[#8c8c8c] hover:text-white hover:bg-[#262626]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-black flex items-center justify-center max-h-[75vh] overflow-auto">
                <img
                  src={selectedScreenshot.fileUrl}
                  alt="Full Screenshot"
                  className="max-h-[70vh] w-auto object-contain rounded-none border border-[#262626]"
                />
              </div>

              <div className="p-3 bg-[#161616] border-t border-[#262626] text-[11px] text-[#8c8c8c] flex items-center justify-between tracking-carbon">
                <span>Resolution: {selectedScreenshot.width || 1920}x{selectedScreenshot.height || 1080}</span>
                <span className="font-medium text-[#24a148]">Activity Level: {selectedScreenshot.activityPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
