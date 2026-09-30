'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  Calendar,
  Coffee,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { formatSecondsToHours } from '@/lib/utils';

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'history'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LEAVE'>('ALL');

  const { data: dailyData, isLoading: loadingDaily } = useQuery({
    queryKey: ['attendance-daily', selectedDate],
    queryFn: () => api.getDailyOverview({ date: selectedDate }),
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['attendance-history', selectedDate],
    queryFn: () => api.getAttendance({ date: selectedDate }),
  });

  const metrics = dailyData?.metrics || {
    totalEmployees: 0,
    workingCount: 0,
    breakCount: 0,
    offlineCount: 0,
    totalWorkSeconds: 0,
    totalActiveSeconds: 0,
    activePercentage: 0,
  };

  const employees = dailyData?.employees || [];
  const historyRecords = (historyData || []).filter((r: any) => {
    const matchesSearch =
      !searchQuery ||
      r.employee?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employee?.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employee?.department?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PRESENT' && r.status === 'PRESENT') ||
      (statusFilter === 'ABSENT' && r.status === 'ABSENT') ||
      (statusFilter === 'LEAVE' && r.status === 'LEAVE');

    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendance & Daily Overview</h1>
            <p className="text-xs text-slate-500 mt-0.5">Authoritative presence tracking derived from active work sessions</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'daily' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily Overview
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'history' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Attendance Log
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="focus:outline-none text-slate-700 text-xs bg-transparent cursor-pointer font-medium"
              />
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <span className="text-slate-500 text-xs font-medium block mb-1">Total Team Size</span>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalEmployees}</div>
            <div className="text-[11px] text-slate-500 mt-1">Acme Technologies</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <span className="text-slate-500 text-xs font-medium block mb-1">Currently Working</span>
            <div className="text-2xl font-bold text-emerald-600">{metrics.workingCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">{metrics.breakCount} on break</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <span className="text-slate-500 text-xs font-medium block mb-1">Total Logged Time</span>
            <div className="text-2xl font-bold text-slate-900">{metrics.formattedTotalWorked || formatSecondsToHours(metrics.totalWorkSeconds)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Across all sessions</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <span className="text-slate-500 text-xs font-medium block mb-1">Active Ratio</span>
            <div className="text-2xl font-bold text-blue-600">{metrics.activePercentage}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Productivity index</div>
          </div>
        </div>

        {/* Content View */}
        {viewMode === 'daily' ? (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Daily Presence Roster ({selectedDate})</h3>
                <p className="text-xs text-slate-500">Punch-in/out boundaries and live status</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-100 uppercase">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">First Punch In</th>
                    <th className="px-5 py-3">Last Punch Out</th>
                    <th className="px-5 py-3">Time Worked</th>
                    <th className="px-5 py-3 text-right">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingDaily ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading daily roster...</td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No records found.</td>
                    </tr>
                  ) : (
                    employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <Link href={`/employees/${emp.id}`} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                            {emp.displayName}
                          </Link>
                          <span className="text-[11px] text-slate-400 block">{emp.employeeCode}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{emp.department || 'General'}</td>
                        <td className="px-5 py-3">
                          {emp.status === 'WORKING' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Working
                            </span>
                          )}
                          {emp.status === 'ON_BREAK' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                              <Coffee className="w-3 h-3 text-amber-500" />
                              Break
                            </span>
                          )}
                          {emp.status === 'OFFLINE' && (
                            <span className="text-slate-400 text-[11px]">Offline</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {emp.firstPunchIn ? new Date(emp.firstPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {emp.lastPunchOut ? new Date(emp.lastPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {emp.formattedWorked || '00:00'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/timelines/daily?employeeId=${emp.id}&date=${selectedDate}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            View Timeline →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Attendance Log ({selectedDate})</h3>
                <p className="text-xs text-slate-500">Authoritative punch records and presence status for all employees</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40 sm:w-48"
                  />
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                  {(['ALL', 'PRESENT', 'ABSENT', 'LEAVE'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-white text-blue-600 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-100 uppercase">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">First In</th>
                    <th className="px-5 py-3">Last Out</th>
                    <th className="px-5 py-3">Work Duration</th>
                    <th className="px-5 py-3">Active Time</th>
                    <th className="px-5 py-3">Break Time</th>
                    <th className="px-5 py-3 text-right">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400">Loading attendance log...</td>
                    </tr>
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400">No records found.</td>
                    </tr>
                  ) : (
                    historyRecords.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {new Date(r.date).toLocaleDateString(undefined, {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`/employees/${r.employee?.id}`} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                            {r.employee?.displayName}
                          </Link>
                          <span className="text-[11px] text-slate-400 block">{r.employee?.employeeCode}</span>
                        </td>
                        <td className="px-5 py-3">
                          {r.status === 'PRESENT' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              PRESENT
                            </span>
                          )}
                          {r.status === 'ABSENT' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              ABSENT
                            </span>
                          )}
                          {r.status === 'LEAVE' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              LEAVE
                            </span>
                          )}
                          {r.status !== 'PRESENT' && r.status !== 'ABSENT' && r.status !== 'LEAVE' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {r.firstPunchIn ? new Date(r.firstPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {r.lastPunchOut ? new Date(r.lastPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">{r.formattedWork || '00:00'}</td>
                        <td className="px-5 py-3 text-emerald-600 font-medium">{r.formattedActive || '00:00'}</td>
                        <td className="px-5 py-3 text-amber-600 font-medium">{r.formattedBreak || '00:00'}</td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/timelines/daily?employeeId=${r.employee?.id}&date=${selectedDate}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            View Timeline →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

