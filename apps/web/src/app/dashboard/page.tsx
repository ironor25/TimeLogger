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

export default function DashboardPage() {
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

  const screenshots: any[] = Array.isArray(screenshotsData) ? screenshotsData : (screenshotsData?.data || []);
  const activeEmployees = dailyOverview?.employees?.filter((e: any) => e.status !== 'OFFLINE') || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organization Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time workforce activity, timer telemetry, and today&apos;s attendance</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry Ingestion Active
            </span>
          </div>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
              <span className="font-medium">Total Workforce</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalEmployees}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{metrics.workingCount} online</span>
              <span>• {metrics.offlineCount} offline</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
              <span className="font-medium">Currently Working</span>
              <PlayCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{metrics.workingCount}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-amber-600 font-semibold">{metrics.breakCount} on break</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
              <span className="font-medium">Today&apos;s Total Worked</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.formattedTotalWorked || formatSecondsToHours(metrics.totalWorkSeconds)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Active: {metrics.formattedTotalActive || formatSecondsToHours(metrics.totalActiveSeconds)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
              <span className="font-medium">Average Productivity</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{metrics.activePercentage}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Active vs idle ratio today</div>
          </div>
        </div>

        {/* Live Active Employees Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Currently Active Team Members</h2>
              <p className="text-xs text-slate-500">Live active sessions and current task allocations</p>
            </div>
            <Link
              href="/attendance"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View Daily Overview →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Current Project / Task</th>
                  <th className="px-5 py-3">Started At</th>
                  <th className="px-5 py-3 text-right">Time Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activeEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No employees are currently punched in.
                    </td>
                  </tr>
                ) : (
                  activeEmployees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        <Link href={`/employees/${emp.id}`} className="hover:text-blue-600 hover:underline">
                          {emp.displayName}
                        </Link>
                        <span className="text-[10px] text-slate-400 block font-normal">{emp.employeeCode}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{emp.department || 'General'}</td>
                      <td className="px-5 py-3">
                        {emp.status === 'WORKING' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Working
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Coffee className="w-3 h-3 text-amber-500" />
                            On Break
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {emp.activeSession?.project ? (
                          <div>
                            <span className="font-medium text-slate-800">{emp.activeSession.project.name}</span>
                            {emp.activeSession.task && (
                              <span className="text-slate-400 text-[11px] block">{emp.activeSession.task.title}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">General Task</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {emp.activeSession?.startedAt ? new Date(emp.activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">
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
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Employee Screen Captures</h3>
                <p className="text-xs text-slate-500">Captured periodically by desktop telemetry agents</p>
              </div>
              <Link href="/screenshots/users" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                View All Screenshots →
              </Link>
            </div>

            {screenshots.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No screenshots recorded yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {screenshots.slice(0, 6).map((sc: any) => (
                  <div key={sc.id} className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-900 aspect-video flex flex-col justify-end">
                    <img
                      src={sc.fileUrl}
                      alt="Screen capture"
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="relative p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white text-[10px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">{sc.employee?.displayName || 'Employee'}</span>
                        <span className="text-slate-300 text-[9px]">{new Date(sc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {sc.activityPercentage !== null && sc.activityPercentage !== undefined && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="flex-1 h-1.5 bg-slate-700/80 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full rounded-full ${
                                sc.activityPercentage >= 50 ? 'bg-[#22C55E]' : sc.activityPercentage >= 20 ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, Math.round(sc.activityPercentage)))}%` }}
                            />
                          </div>
                          <span className="text-emerald-400 font-bold text-[9px] font-mono shrink-0">{Math.round(sc.activityPercentage)}%</span>
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
            {/* Pending Time Entries Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  Manual Time Approvals
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {pendingTime?.length || 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Manual time requests awaiting manager verification.
              </p>
              <Link
                href="/time/approvals"
                className="block text-center w-full py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Review Time Requests
              </Link>
            </div>

            {/* Pending Leaves Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <CalendarOff className="w-4 h-4 text-purple-600" />
                  Leave Applications
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {pendingLeaves?.length || 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Employee leave requests requiring approval.
              </p>
              <Link
                href="/leaves/requests"
                className="block text-center w-full py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Review Leave Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
