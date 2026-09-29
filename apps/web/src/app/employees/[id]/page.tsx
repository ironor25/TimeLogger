'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  User,
  Building,
  Calendar,
  Clock,
  Laptop,
  Shield,
  ArrowLeft,
  CalendarCheck,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { formatSecondsToHours, formatDateTime } from '@/lib/utils';

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.getEmployee(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-xs text-slate-400">Loading employee record...</div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-xs text-red-500">Employee not found.</div>
      </AppLayout>
    );
  }

  const activeSchedule = employee.scheduleAssignments?.[0]?.workSchedule;
  const devices = employee.devices || [];
  const sessions = employee.workSessions || [];
  const leaveBalances = employee.leaveBalances || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/employees"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Employee Directory</span>
          </Link>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xl">
                {employee.firstName?.[0]}
                {employee.lastName?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{employee.displayName}</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {employee.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                  <span>{employee.email}</span>
                  <span>•</span>
                  <span>Code: {employee.employeeCode}</span>
                  <span>•</span>
                  <span>{employee.department?.name || 'Unassigned Dept'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/timelines/daily?employeeId=${employee.id}`}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>View Daily Timeline</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 3-Column Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Work Schedule */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Assigned Work Schedule</span>
            </div>
            {activeSchedule ? (
              <div className="space-y-2 text-xs text-slate-600">
                <div className="font-semibold text-slate-800 text-sm">{activeSchedule.name}</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Shift Hours:</span>
                  <span className="font-medium text-slate-800">{activeSchedule.workStarts} - {activeSchedule.workEnds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Punch-in Allowed:</span>
                  <span className="font-medium text-slate-800">From {activeSchedule.punchInAllowedFrom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Day Reset Time:</span>
                  <span className="font-medium text-slate-800">{activeSchedule.dayResetTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timezone:</span>
                  <span className="font-medium text-slate-800">{activeSchedule.timezone}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Default organization shift applies</div>
            )}
          </div>

          {/* Registered Devices */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-100 pb-2">
              <Laptop className="w-4 h-4 text-purple-600" />
              <span>Registered Desktop Devices ({devices.length})</span>
            </div>
            {devices.length === 0 ? (
              <div className="text-xs text-slate-400">No desktop agents linked yet.</div>
            ) : (
              <div className="space-y-2">
                {devices.map((d: any) => (
                  <div key={d.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="font-semibold text-slate-800">{d.deviceName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{d.platform} • {d.platformVersion || 'Desktop App'}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Last Seen: {formatDateTime(d.lastSeenAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Balances */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-100 pb-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Leave Allowances ({new Date().getFullYear()})</span>
            </div>
            {leaveBalances.length === 0 ? (
              <div className="text-xs text-slate-400">No leave quotas allocated.</div>
            ) : (
              <div className="space-y-2">
                {leaveBalances.map((lb: any) => (
                  <div key={lb.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{lb.leaveType?.name || 'Leave'}</span>
                    <span className="font-bold text-slate-900">
                      {lb.remainingDays} <span className="text-slate-400 font-normal">/ {lb.totalDays} left</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Work Sessions */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Recent Work Sessions</h3>
            <p className="text-xs text-slate-500">Authoritative server timestamps and recorded tasks</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-100 uppercase">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Start Time</th>
                  <th className="px-5 py-3">End Time</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Project / Task</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-slate-400">No work sessions recorded.</td>
                  </tr>
                ) : (
                  sessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {new Date(s.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {s.endedAt ? new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {formatSecondsToHours(s.durationSeconds)} hrs
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {s.project ? `${s.project.name} ${s.task ? `(${s.task.title})` : ''}` : 'General Work'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
