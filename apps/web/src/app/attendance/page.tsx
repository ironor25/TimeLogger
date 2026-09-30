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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Attendance & Daily Overview</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">Authoritative presence tracking and punch telemetry derived from active work sessions</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex border border-[#e0e0e0] bg-white rounded-none p-0.5">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-none text-xs font-normal tracking-carbon transition-colors ${
                  viewMode === 'daily' ? 'bg-[#0f62fe] text-white font-medium' : 'text-[#525252] hover:text-[#161616] hover:bg-[#f4f4f4]'
                }`}
              >
                Daily Overview
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1.5 rounded-none text-xs font-normal tracking-carbon transition-colors ${
                  viewMode === 'history' ? 'bg-[#0f62fe] text-white font-medium' : 'text-[#525252] hover:text-[#161616] hover:bg-[#f4f4f4]'
                }`}
              >
                Attendance Log
              </button>
            </div>

            <div className="flex items-center gap-2 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#525252]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="focus:outline-none text-[#161616] text-xs bg-transparent cursor-pointer font-medium tracking-carbon"
              />
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <span className="text-[#525252] text-xs font-normal block mb-1 tracking-carbon">Total Team Size</span>
            <div className="text-3xl font-light text-[#161616] tracking-tight">{metrics.totalEmployees}</div>
            <div className="text-[11px] text-[#8c8c8c] mt-2 tracking-carbon">Acme Technologies</div>
          </div>

          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <span className="text-[#525252] text-xs font-normal block mb-1 tracking-carbon">Currently Working</span>
            <div className="text-3xl font-light text-[#24a148] tracking-tight">{metrics.workingCount}</div>
            <div className="text-[11px] text-[#525252] mt-2 tracking-carbon">{metrics.breakCount} on break</div>
          </div>

          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <span className="text-[#525252] text-xs font-normal block mb-1 tracking-carbon">Total Logged Time</span>
            <div className="text-3xl font-light text-[#161616] tracking-tight">{metrics.formattedTotalWorked || formatSecondsToHours(metrics.totalWorkSeconds)}</div>
            <div className="text-[11px] text-[#525252] mt-2 tracking-carbon">Across all sessions</div>
          </div>

          <div className="bg-white p-5 border border-[#e0e0e0] rounded-none">
            <span className="text-[#525252] text-xs font-normal block mb-1 tracking-carbon">Active Ratio</span>
            <div className="text-3xl font-light text-[#0f62fe] tracking-tight">{metrics.activePercentage}%</div>
            <div className="text-[11px] text-[#525252] mt-2 tracking-carbon">Productivity index</div>
          </div>
        </div>

        {/* Content View */}
        {viewMode === 'daily' ? (
          <div className="bg-white border border-[#e0e0e0] rounded-none overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e0e0e0] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-medium text-[#161616]">Daily Presence Roster ({selectedDate})</h3>
                <p className="text-xs text-[#525252] tracking-carbon">Punch-in/out boundaries and live status</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f4f4] text-[#525252] text-[11px] font-normal uppercase tracking-wider border-b border-[#e0e0e0]">
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
                <tbody className="divide-y divide-[#e0e0e0] text-[#161616]">
                  {loadingDaily ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-[#8c8c8c] tracking-carbon">Loading daily roster...</td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-[#8c8c8c] tracking-carbon">No records found.</td>
                    </tr>
                  ) : (
                    employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-[#f4f4f4] transition-colors">
                        <td className="px-5 py-3 font-normal">
                          <Link href={`/employees/${emp.id}`} className="font-medium text-[#161616] hover:text-[#0f62fe] hover:underline">
                            {emp.displayName}
                          </Link>
                          <span className="text-[11px] text-[#8c8c8c] block">{emp.employeeCode}</span>
                        </td>
                        <td className="px-5 py-3 text-[#525252]">{emp.department || 'General'}</td>
                        <td className="px-5 py-3">
                          {emp.status === 'WORKING' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#defbe6] text-[#0e6027] border border-[#a7f0ba]">
                              <span className="w-1.5 h-1.5 bg-[#24a148]"></span>
                              Working
                            </span>
                          )}
                          {emp.status === 'ON_BREAK' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#fdf2cc] text-[#6d4f00] border border-[#fbe499]">
                              <Coffee className="w-3 h-3 text-[#6d4f00]" />
                              Break
                            </span>
                          )}
                          {emp.status === 'OFFLINE' && (
                            <span className="text-[#8c8c8c] text-[11px]">Offline</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#525252]">
                          {emp.firstPunchIn ? new Date(emp.firstPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 text-[#525252]">
                          {emp.lastPunchOut ? new Date(emp.lastPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 font-medium text-[#161616]">
                          {emp.formattedWorked || '00:00'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/timelines/daily?employeeId=${emp.id}&date=${selectedDate}`}
                            className="text-xs font-normal text-[#0f62fe] hover:text-[#0043ce] hover:underline tracking-carbon"
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
          <div className="bg-white border border-[#e0e0e0] rounded-none overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e0e0e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <h3 className="text-sm font-medium text-[#161616]">Attendance Log ({selectedDate})</h3>
                <p className="text-xs text-[#525252] tracking-carbon">Authoritative punch records and presence status for all employees</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8c8c8c]" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs text-[#161616] focus:outline-none focus:border-[#0f62fe] w-40 sm:w-48 tracking-carbon"
                  />
                </div>

                <div className="inline-flex border border-[#e0e0e0] bg-[#f4f4f4] p-0.5 text-xs rounded-none">
                  {(['ALL', 'PRESENT', 'ABSENT', 'LEAVE'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 text-[11px] font-normal rounded-none transition-colors tracking-carbon ${
                        statusFilter === st
                          ? 'bg-white text-[#0f62fe] font-medium border border-[#e0e0e0]'
                          : 'text-[#525252] hover:text-[#161616]'
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
                <thead className="bg-[#f4f4f4] text-[#525252] text-[11px] font-normal uppercase tracking-wider border-b border-[#e0e0e0]">
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
                <tbody className="divide-y divide-[#e0e0e0] text-[#161616]">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-[#8c8c8c] tracking-carbon">Loading attendance log...</td>
                    </tr>
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-[#8c8c8c] tracking-carbon">No records found.</td>
                    </tr>
                  ) : (
                    historyRecords.map((r: any) => (
                      <tr key={r.id} className="hover:bg-[#f4f4f4] transition-colors">
                        <td className="px-5 py-3 font-normal text-[#161616]">
                          {new Date(r.date).toLocaleDateString(undefined, {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`/employees/${r.employee?.id}`} className="font-medium text-[#161616] hover:text-[#0f62fe] hover:underline">
                            {r.employee?.displayName}
                          </Link>
                          <span className="text-[11px] text-[#8c8c8c] block">{r.employee?.employeeCode}</span>
                        </td>
                        <td className="px-5 py-3">
                          {r.status === 'PRESENT' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#defbe6] text-[#0e6027] border border-[#a7f0ba]">
                              <span className="w-1.5 h-1.5 bg-[#24a148]"></span>
                              PRESENT
                            </span>
                          )}
                          {r.status === 'ABSENT' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#ffebee] text-[#da1e28] border border-[#ffb3ba]">
                              <span className="w-1.5 h-1.5 bg-[#da1e28]"></span>
                              ABSENT
                            </span>
                          )}
                          {r.status === 'LEAVE' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#edf5ff] text-[#0043ce] border border-[#a6c8ff]">
                              <span className="w-1.5 h-1.5 bg-[#0f62fe]"></span>
                              LEAVE
                            </span>
                          )}
                          {r.status !== 'PRESENT' && r.status !== 'ABSENT' && r.status !== 'LEAVE' && (
                            <span className="px-2 py-0.5 rounded-none text-[11px] font-normal bg-[#f4f4f4] text-[#525252] border border-[#e0e0e0]">
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#525252]">
                          {r.firstPunchIn ? new Date(r.firstPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 text-[#525252]">
                          {r.lastPunchOut ? new Date(r.lastPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-5 py-3 font-medium text-[#161616]">{r.formattedWork || '00:00'}</td>
                        <td className="px-5 py-3 text-[#24a148] font-medium">{r.formattedActive || '00:00'}</td>
                        <td className="px-5 py-3 text-[#6d4f00] font-medium">{r.formattedBreak || '00:00'}</td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/timelines/daily?employeeId=${r.employee?.id}&date=${selectedDate}`}
                            className="text-xs font-normal text-[#0f62fe] hover:text-[#0043ce] hover:underline tracking-carbon"
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
