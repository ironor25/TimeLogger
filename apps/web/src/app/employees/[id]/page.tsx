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
        <div className="py-16 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading employee record...</div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-xs text-[#da1e28] tracking-carbon">Employee not found.</div>
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
            className="inline-flex items-center gap-1.5 text-xs font-normal text-[#525252] hover:text-[#0f62fe] mb-3 transition-colors tracking-carbon"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Employee Directory</span>
          </Link>

          <div className="bg-white p-6 border border-[#e0e0e0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#edf5ff] border border-[#a6c8ff] text-[#0043ce] flex items-center justify-center font-light text-xl">
                {employee.firstName?.[0]}
                {employee.lastName?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-light text-[#161616] tracking-tight">{employee.displayName}</h1>
                  <span className={`px-2 py-0.5 text-[10px] tracking-carbon border ${
                    employee.status === 'ACTIVE'
                      ? 'bg-[#defbe6] text-[#0e6027] border-[#a7f0ba]'
                      : 'bg-[#ffebee] text-[#da1e28] border-[#ffb3ba]'
                  }`}>
                    {employee.status}
                  </span>
                </div>
                <div className="text-xs text-[#525252] mt-1 flex flex-wrap items-center gap-3 tracking-carbon">
                  <span>{employee.email}</span>
                  <span className="text-[#8c8c8c]">•</span>
                  <span className="font-mono">ID: {employee.employeeCode}</span>
                  <span className="text-[#8c8c8c]">•</span>
                  <span>{employee.department?.name || 'Unassigned Dept'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/timelines/daily?employeeId=${employee.id}`}
                className="px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal transition-colors flex items-center gap-1.5 tracking-carbon"
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
          <div className="bg-white p-5 border border-[#e0e0e0] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#161616] border-b border-[#e0e0e0] pb-2 tracking-carbon uppercase">
              <Calendar className="w-4 h-4 text-[#0f62fe]" />
              <span>Assigned Work Schedule</span>
            </div>
            {activeSchedule ? (
              <div className="space-y-2 text-xs text-[#525252] tracking-carbon">
                <div className="font-semibold text-[#161616] text-sm">{activeSchedule.name}</div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c8c]">Shift Hours:</span>
                  <span className="font-mono text-[#161616]">{activeSchedule.workStarts} - {activeSchedule.workEnds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c8c]">Punch-in Allowed:</span>
                  <span className="font-mono text-[#161616]">From {activeSchedule.punchInAllowedFrom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c8c]">Day Reset Time:</span>
                  <span className="font-mono text-[#161616]">{activeSchedule.dayResetTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c8c]">Timezone:</span>
                  <span className="font-mono text-[#161616]">{activeSchedule.timezone}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#8c8c8c] tracking-carbon">Default organization shift applies</div>
            )}
          </div>

          {/* Registered Devices */}
          <div className="bg-white p-5 border border-[#e0e0e0] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#161616] border-b border-[#e0e0e0] pb-2 tracking-carbon uppercase">
              <Laptop className="w-4 h-4 text-[#0f62fe]" />
              <span>Registered Desktop Devices ({devices.length})</span>
            </div>
            {devices.length === 0 ? (
              <div className="text-xs text-[#8c8c8c] tracking-carbon">No desktop agents linked yet.</div>
            ) : (
              <div className="space-y-2">
                {devices.map((d: any) => (
                  <div key={d.id} className="p-3 bg-[#f4f4f4] border border-[#e0e0e0] text-xs tracking-carbon">
                    <div className="font-semibold text-[#161616]">{d.deviceName}</div>
                    <div className="text-[11px] text-[#525252] mt-0.5">{d.platform} • {d.platformVersion || 'Desktop App'}</div>
                    <div className="text-[10px] text-[#8c8c8c] mt-1 font-mono">Last Seen: {formatDateTime(d.lastSeenAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Balances */}
          <div className="bg-white p-5 border border-[#e0e0e0] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#161616] border-b border-[#e0e0e0] pb-2 tracking-carbon uppercase">
              <CalendarCheck className="w-4 h-4 text-[#0f62fe]" />
              <span>Leave Allowances ({new Date().getFullYear()})</span>
            </div>
            {leaveBalances.length === 0 ? (
              <div className="text-xs text-[#8c8c8c] tracking-carbon">No leave quotas allocated.</div>
            ) : (
              <div className="space-y-2">
                {leaveBalances.map((lb: any) => (
                  <div key={lb.id} className="flex items-center justify-between text-xs tracking-carbon">
                    <span className="text-[#525252]">{lb.leaveType?.name || 'Leave'}</span>
                    <span className="font-semibold text-[#161616]">
                      {lb.remainingDays} <span className="text-[#8c8c8c] font-normal">/ {lb.totalDays} left</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Work Sessions */}
        <div className="bg-white border border-[#e0e0e0]">
          <div className="px-5 py-4 border-b border-[#e0e0e0]">
            <h3 className="text-sm font-semibold text-[#161616] tracking-carbon">Recent Work Sessions</h3>
            <p className="text-xs text-[#525252] tracking-carbon">Authoritative server timestamps and recorded tasks</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tracking-carbon">
              <thead className="bg-[#f4f4f4] text-[#525252] text-[11px] font-semibold border-b border-[#e0e0e0] uppercase">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Start Time</th>
                  <th className="px-5 py-3">End Time</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Project / Task</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0] text-[#161616]">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-[#8c8c8c]">No work sessions recorded.</td>
                  </tr>
                ) : (
                  sessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-[#f4f4f4] transition-colors">
                      <td className="px-5 py-3 font-medium text-[#161616]">
                        {new Date(s.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-[#525252] font-mono">
                        {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 text-[#525252] font-mono">
                        {s.endedAt ? new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#161616] font-mono">
                        {formatSecondsToHours(s.durationSeconds)} hrs
                      </td>
                      <td className="px-5 py-3 text-[#525252]">
                        {s.project ? `${s.project.name} ${s.task ? `(${s.task.title})` : ''}` : 'General Work'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 text-[10px] bg-[#f4f4f4] text-[#161616] border border-[#e0e0e0]">
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
