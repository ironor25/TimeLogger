'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  User,
  Building2,
  Clock,
  Activity,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export default function EmployeeSummaryReportPage() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Default to 7 days window
  const defaultStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [formatMode, setFormatMode] = useState<'hhmm' | 'decimal'>('hhmm');

  const { data: summaryData, isLoading, refetch } = useQuery({
    queryKey: ['employee-summary-report', { startDate, endDate, departmentId, employeeId }],
    queryFn: () =>
      api.getEmployeeSummary({
        startDate,
        endDate,
        departmentId: departmentId || undefined,
        employeeId: employeeId || undefined,
      }),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => api.getDepartments(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const rows = Array.isArray(summaryData) ? summaryData : summaryData?.items || summaryData?.data || [];

  // Quick preset ranges
  const setPreset = (preset: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month') => {
    const now = new Date();
    if (preset === 'today') {
      const s = now.toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(s);
    } else if (preset === 'yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      setStartDate(y);
      setEndDate(y);
    } else if (preset === 'this_week') {
      const day = now.getDay() || 7;
      const monday = new Date(now.setDate(now.getDate() - day + 1)).toISOString().split('T')[0];
      setStartDate(monday);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Helper formatter
  const formatTime = (seconds: number) => {
    if (formatMode === 'decimal') {
      const hours = (seconds || 0) / 3600;
      return `${hours.toFixed(2)} hrs`;
    }
    return formatDuration(seconds || 0);
  };

  // Aggregate stats
  const totalTrackedSeconds = rows.reduce((acc: number, r: any) => acc + (r.totalWorkedSeconds ?? r.totalSeconds ?? 0), 0);
  const totalActiveSeconds = rows.reduce((acc: number, r: any) => acc + (r.activeSeconds || 0), 0);
  const totalIdleSeconds = rows.reduce((acc: number, r: any) => acc + (r.idleSeconds || 0), 0);
  const avgProductivity =
    rows.length > 0
      ? Math.round(
          rows.reduce((acc: number, r: any) => acc + (r.activePercentage ?? r.productivityScore ?? 0), 0) / rows.length,
        )
      : 0;

  const handleExportCsv = () => {
    const exportUrl = api.getExportUrl({
      type: 'summary',
      startDate,
      endDate,
      departmentId: departmentId || undefined,
      employeeId: employeeId || undefined,
    });
    window.open(exportUrl, '_blank');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Productivity Summary</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive report of workforce tracked hours, activity levels, and break duration
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Aggregated KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Logged Time</p>
            <p className="text-xl font-bold text-blue-600 font-mono mt-0.5">
              {formatTime(totalTrackedSeconds)}
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Time</p>
            <p className="text-xl font-bold text-emerald-600 font-mono mt-0.5">
              {formatTime(totalActiveSeconds)}
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Idle Time</p>
            <p className="text-xl font-bold text-amber-600 font-mono mt-0.5">
              {formatTime(totalIdleSeconds)}
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Avg Productivity</p>
            <p className="text-xl font-bold text-purple-600 mt-0.5">{avgProductivity}%</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-3">
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Preset:</span>
              <button
                onClick={() => setPreset('today')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setPreset('yesterday')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                Yesterday
              </button>
              <button
                onClick={() => setPreset('this_week')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                This Week
              </button>
              <button
                onClick={() => setPreset('this_month')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                This Month
              </button>
            </div>

            {/* Time Format Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFormatMode('hhmm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  formatMode === 'hhmm' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                HH:MM:SS
              </button>
              <button
                onClick={() => setFormatMode('decimal')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  formatMode === 'decimal' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Decimal (Hours)
              </button>
            </div>
          </div>

          {/* Date & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
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

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
              >
                <option value="">All Departments</option>
                {departments?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
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

        {/* Report Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400">Calculating report summary...</div>
          ) : rows.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs space-y-2">
              <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No time recorded in this period</p>
              <p className="text-slate-400">Try expanding the date range or removing department filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 font-mono">Tracked Time</th>
                    <th className="py-3 px-4 font-mono">Active Time</th>
                    <th className="py-3 px-4 font-mono">Idle Time</th>
                    <th className="py-3 px-4 font-mono">Break Time</th>
                    <th className="py-3 px-4 font-mono">Manual Time</th>
                    <th className="py-3 px-4 text-center">Productivity</th>
                    <th className="py-3 px-4 text-right">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row: any) => {
                    const empName = row.displayName || row.employee?.displayName || 'Unknown';
                    const empCode = row.employeeCode || row.employee?.employeeCode || '';
                    const deptName = row.departmentName || row.employee?.department?.name || 'General';
                    const empId = row.employeeId || row.employee?.id || empCode;
                    const prodScore = row.activePercentage ?? row.productivityScore ?? 0;
                    const totalSec = row.totalWorkedSeconds ?? row.totalSeconds ?? 0;
                    const initials = empName
                      .split(' ')
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={empId} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                              {initials || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{empName}</p>
                              <p className="text-[10px] text-slate-400">{empCode || 'Staff'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {deptName}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {formatTime(totalSec)}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                          {formatTime(row.activeSeconds || 0)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-amber-600">
                          {formatTime(row.idleSeconds || 0)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {formatTime(row.breakSeconds || 0)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {formatTime(row.manualSeconds || 0)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold ${
                                prodScore >= 80
                                  ? 'text-emerald-600'
                                  : prodScore >= 50
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                              }`}
                            >
                              {prodScore}%
                            </span>
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  prodScore >= 80
                                    ? 'bg-emerald-500'
                                    : prodScore >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, prodScore)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600">
                          {row.sessionsCount ?? row.sessionCount ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
