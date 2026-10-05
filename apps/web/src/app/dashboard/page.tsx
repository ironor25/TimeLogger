'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  Users,
  Clock,
  PlayCircle,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Camera,
  FolderGit2,
  CalendarOff,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { formatSecondsToHours } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { role, employee } = useAuth();
  const isEmployeeRole = role === 'EMPLOYEE';

  const { data: dailyOverview, isLoading: loadingDaily } = useQuery({
    queryKey: ['daily-overview'],
    queryFn: () => api.getDailyOverview(),
    refetchInterval: 15000,
  });

  const { data: screenshotsData } = useQuery({
    queryKey: ['recent-screenshots'],
    queryFn: () => api.getScreenshots({ limit: 6 }),
  });

  const { data: pendingTime } = useQuery({
    queryKey: ['pending-time'],
    queryFn: () => api.getTimeEntries({ status: 'PENDING' }),
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: () => api.getLeaveRequests({ status: 'PENDING' }),
  });

  const metrics = dailyOverview?.metrics || {
    totalEmployees: 0,
    workingCount: 0,
    breakCount: 0,
    offlineCount: 0,
    totalWorkSeconds: 0,
    totalActiveSeconds: 0,
    totalIdleSeconds: 0,
    activePercentage: 0,
  };

  const rawScreenshots: any[] = Array.isArray(screenshotsData) ? screenshotsData : (screenshotsData?.data || []);
  const screenshots: any[] = isEmployeeRole && employee?.id
    ? rawScreenshots.filter((s: any) => s.employeeId === employee.id || s.employee?.id === employee.id)
    : rawScreenshots;

  const rawActive = dailyOverview?.employees || [];
  const activeEmployees = isEmployeeRole && employee?.id
    ? rawActive.filter((e: any) => (e.id === employee.id || e.email === employee?.email) && e.status !== 'OFFLINE')
    : rawActive.filter((e: any) => e.status !== 'OFFLINE');

  const myEmp = isEmployeeRole && employee?.id
    ? rawActive.find((e: any) => e.id === employee.id || e.email === employee?.email)
    : null;

  const isWorking = myEmp ? myEmp.status === 'WORKING' : metrics.workingCount > 0;
  const isOnBreak = myEmp ? myEmp.status === 'ON_BREAK' : metrics.breakCount > 0;

  const displayLoggedTime = isEmployeeRole
    ? (myEmp?.formattedWorked || '00:00')
    : (metrics.formattedTotalWorked || formatSecondsToHours(metrics.totalWorkSeconds));

  const displayActiveRatio = isEmployeeRole
    ? (myEmp?.todayWorkedSeconds ? 100 : 0)
    : metrics.activePercentage;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">
              {isEmployeeRole ? 'Personal Workspace Dashboard' : 'Organization Dashboard'}
            </h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              {isEmployeeRole
                ? `Welcome back, ${employee?.displayName || 'User'}. Here is your real-time daily activity summary.`
                : 'Real-time workforce telemetry, activity monitoring, and presence tracking'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#defbe6] text-[#0e6027] border border-[#a7f0ba] text-xs font-normal tracking-carbon rounded-none">
              <span className="w-1.5 h-1.5 bg-[#24a148]"></span>
              Telemetry Active
            </span>
          </div>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <div className="flex items-center justify-between text-[#525252] text-xs mb-2">
              <span className="font-normal tracking-carbon">
                {isEmployeeRole ? 'My Status' : 'Total Workforce'}
              </span>
              <Users className="w-4 h-4 text-[#8c8c8c]" />
            </div>
            <div className="text-3xl font-light text-[#161616] tracking-tight">
              {isEmployeeRole
                ? (isWorking ? 'Active' : isOnBreak ? 'On Break' : 'Offline')
                : metrics.totalEmployees}
            </div>
            <div className="text-[11px] text-[#525252] mt-2 flex items-center gap-1 tracking-carbon">
              {isEmployeeRole ? (
                <span className={isWorking ? 'text-[#24a148] font-medium' : isOnBreak ? 'text-[#6d4f00]' : 'text-[#8c8c8c]'}>
                  {isWorking ? 'Currently punched in' : isOnBreak ? 'Currently on break' : 'No active session'}
                </span>
              ) : (
                <>
                  <span className="text-[#24a148] font-medium">{metrics.workingCount} online</span>
                  <span>• {metrics.offlineCount} offline</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <div className="flex items-center justify-between text-[#525252] text-xs mb-2">
              <span className="font-normal tracking-carbon">
                {isEmployeeRole ? 'Current Activity' : 'Currently Working'}
              </span>
              <PlayCircle className="w-4 h-4 text-[#0f62fe]" />
            </div>
            <div className="text-3xl font-light text-[#0f62fe] tracking-tight">
              {isEmployeeRole
                ? (isWorking ? 'Running' : isOnBreak ? 'On Break' : 'Stopped')
                : metrics.workingCount}
            </div>
            <div className="text-[11px] text-[#525252] mt-2 flex items-center gap-1 tracking-carbon">
              {isEmployeeRole ? (
                <span>{myEmp?.status === 'WORKING' ? 'Standard tracking' : 'Punched out'}</span>
              ) : (
                <span className="text-[#6d4f00] font-medium">{metrics.breakCount} on break</span>
              )}
            </div>
          </div>

          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <div className="flex items-center justify-between text-[#525252] text-xs mb-2">
              <span className="font-normal tracking-carbon">Today&apos;s Total Worked</span>
              <Clock className="w-4 h-4 text-[#8c8c8c]" />
            </div>
            <div className="text-3xl font-light text-[#161616] tracking-tight">
              {displayLoggedTime}
            </div>
            <div className="text-[11px] text-[#525252] mt-2 tracking-carbon">
              {isEmployeeRole ? 'Personal tracked total today' : `Active: ${metrics.formattedTotalActive || formatSecondsToHours(metrics.totalActiveSeconds)}`}
            </div>
          </div>

          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <div className="flex items-center justify-between text-[#525252] text-xs mb-2">
              <span className="font-normal tracking-carbon">Average Productivity</span>
              <TrendingUp className="w-4 h-4 text-[#24a148]" />
            </div>
            <div className="text-3xl font-light text-[#24a148] tracking-tight">{displayActiveRatio}%</div>
            <div className="text-[11px] text-[#525252] mt-2 tracking-carbon">Active vs idle ratio today</div>
          </div>
        </div>

        {/* Live Active Employees Table */}
        <div className="bg-white border border-[#e0e0e0] rounded-none overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e0e0e0] flex items-center justify-between bg-white">
            <div>
              <h2 className="text-sm font-medium text-[#161616]">
                {isEmployeeRole ? 'My Current Work Status' : 'Currently Active Team Members'}
              </h2>
              <p className="text-xs text-[#525252] tracking-carbon">
                {isEmployeeRole
                  ? 'Your active session telemetry and assigned task'
                  : 'Live active sessions and current task allocations'}
              </p>
            </div>
            <Link
              href="/attendance"
              className="text-xs font-normal text-[#0f62fe] hover:text-[#0043ce] hover:underline flex items-center gap-1 tracking-carbon"
            >
              View Daily Overview →
            </Link>
          </div>


          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f4f4] text-[#525252] text-[11px] font-normal uppercase tracking-wider border-b border-[#e0e0e0]">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Current Project / Task</th>
                  <th className="px-5 py-3">Started At</th>
                  <th className="px-5 py-3 text-right">Time Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0] text-[#161616]">
                {activeEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#8c8c8c] tracking-carbon">
                      No employees are currently punched in.
                    </td>
                  </tr>
                ) : (
                  activeEmployees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-[#f4f4f4] transition-colors">
                      <td className="px-5 py-3 font-normal">
                        {!isEmployeeRole ? (
                          <Link href={`/employees/${emp.id}`} className="font-medium text-[#161616] hover:text-[#0f62fe] hover:underline">
                            {emp.displayName}
                          </Link>
                        ) : (
                          <span className="font-medium text-[#161616]">{emp.displayName}</span>
                        )}
                        <span className="text-[10px] text-[#8c8c8c] block font-normal">{emp.employeeCode}</span>
                      </td>
                      <td className="px-5 py-3 text-[#525252]">{emp.department || 'General'}</td>
                      <td className="px-5 py-3">
                        {emp.status === 'WORKING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#defbe6] text-[#0e6027] border border-[#a7f0ba]">
                            <span className="w-1.5 h-1.5 bg-[#24a148]"></span>
                            Working
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#fdf2cc] text-[#6d4f00] border border-[#fbe499]">
                            <Coffee className="w-3 h-3 text-[#6d4f00]" />
                            On Break
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {emp.activeSession?.project ? (
                          <div>
                            <span className="font-medium text-[#161616]">{emp.activeSession.project.name}</span>
                            {emp.activeSession.task && (
                              <span className="text-[#8c8c8c] text-[11px] block">{emp.activeSession.task.title}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#8c8c8c]">General Task</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#525252]">
                        {emp.activeSession?.startedAt ? new Date(emp.activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-[#161616]">
                        {emp.formattedWorked || '00:00'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2-Column Grid: Recent Screenshots & Pending Approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Screenshots (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-[#e0e0e0] rounded-none p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-[#161616]">Recent Screen Captures</h3>
                <p className="text-xs text-[#525252] tracking-carbon">Captured periodically by desktop telemetry agents</p>
              </div>
              <Link href="/screenshots/users" className="text-xs font-normal text-[#0f62fe] hover:text-[#0043ce] hover:underline tracking-carbon">
                View All Screenshots →
              </Link>
            </div>

            {screenshots.length === 0 ? (
              <div className="py-12 text-center text-[#8c8c8c] text-xs tracking-carbon">No screenshots recorded yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {screenshots.slice(0, 6).map((sc: any) => (
                  <div key={sc.id} className="group relative rounded-none border border-[#e0e0e0] overflow-hidden bg-[#161616] aspect-video flex flex-col justify-end">
                    <img
                      src={sc.fileUrl}
                      alt="Screen capture"
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="relative p-2 bg-[#161616]/90 border-t border-[#262626] text-white text-[10px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-normal truncate text-white">{sc.employee?.displayName || 'Employee'}</span>
                        <span className="text-[#8c8c8c] text-[9px]">{new Date(sc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {sc.activityPercentage !== null && sc.activityPercentage !== undefined && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="flex-1 h-1 bg-[#262626] rounded-none overflow-hidden flex">
                            <div
                              className={`h-full rounded-none ${
                                sc.activityPercentage >= 50 ? 'bg-[#24a148]' : sc.activityPercentage >= 20 ? 'bg-[#f1c21b]' : 'bg-[#da1e28]'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, Math.round(sc.activityPercentage)))}%` }}
                            />
                          </div>
                          <span className="text-[#24a148] font-normal text-[9px] font-mono shrink-0">{Math.round(sc.activityPercentage)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Approvals & Quick Alerts (1 col) */}
          <div className="space-y-4">
            {!isEmployeeRole ? (
              /* Pending Time Entries Card for Management */
              <div className="bg-white border border-[#e0e0e0] rounded-none p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#161616] flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#0f62fe]" />
                    Time Approvals
                  </span>
                  <span className="text-[10px] font-normal px-2 py-0.5 bg-[#edf5ff] text-[#0f62fe] border border-[#a6c8ff] rounded-none">
                    {pendingTime?.length || 0}
                  </span>
                </div>
                <p className="text-[11px] text-[#525252] mb-4 tracking-carbon">
                  Manual time requests awaiting manager verification.
                </p>
                <Link
                  href="/time/approvals"
                  className="block text-center w-full py-2 bg-[#f4f4f4] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-normal text-[#161616] rounded-none transition-colors tracking-carbon"
                >
                  Review Time Requests
                </Link>
              </div>
            ) : (
              /* Personal Quick Navigation Card for Employee */
              <div className="bg-white border border-[#e0e0e0] rounded-none p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#161616] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0f62fe]" />
                    My Work Timelines
                  </span>
                </div>
                <p className="text-[11px] text-[#525252] mb-4 tracking-carbon">
                  Inspect your personal activity breakdown and daily punches.
                </p>
                <Link
                  href="/timelines/daily"
                  className="block text-center w-full py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal rounded-none transition-colors tracking-carbon"
                >
                  View My Timelines →
                </Link>
              </div>
            )}

            {/* Pending Leaves Card */}
            <div className="bg-white border border-[#e0e0e0] rounded-none p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#161616] flex items-center gap-2">
                  <CalendarOff className="w-4 h-4 text-[#6929c4]" />
                  {isEmployeeRole ? 'My Leave Applications' : 'Leave Applications'}
                </span>
                <span className="text-[10px] font-normal px-2 py-0.5 bg-[#f6f2ff] text-[#6929c4] border border-[#d4bbff] rounded-none">
                  {pendingLeaves?.length || 0}
                </span>
              </div>
              <p className="text-[11px] text-[#525252] mb-4 tracking-carbon">
                {isEmployeeRole
                  ? 'Request PTO, sick leave, casual time off, or view approval status.'
                  : 'Employee leave requests requiring approval.'}
              </p>
              <Link
                href="/leaves/requests"
                className="block text-center w-full py-2 bg-[#f4f4f4] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-normal text-[#161616] rounded-none transition-colors tracking-carbon"
              >
                {isEmployeeRole ? 'Apply for Leave' : 'Review Leave Requests'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
