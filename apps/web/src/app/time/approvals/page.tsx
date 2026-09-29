'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function TimeApprovalsPage() {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();

  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [employeeId, setEmployeeId] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Submit manual time form state
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formError, setFormError] = useState('');

  const { data: timeEntriesData, isLoading } = useQuery({
    queryKey: ['time-entries', { status: statusFilter, employeeId }],
    queryFn: () =>
      api.getTimeEntries({
        status: statusFilter || undefined,
        employeeId: employeeId || undefined,
      }),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => api.getProjects(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveTimeEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.rejectTimeEntry(id, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      setRejectEntryId(null);
      setRejectionReason('');
    },
  });

  const submitManualTimeMutation = useMutation({
    mutationFn: (body: any) => api.createTimeEntry(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      setIsSubmitModalOpen(false);
      resetSubmitForm();
    },
    onError: (err: any) => setFormError(err.message || 'Failed to submit manual time entry'),
  });

  const resetSubmitForm = () => {
    setFormEmployeeId('');
    setFormProjectId('');
    setFormStartTime('');
    setFormEndTime('');
    setFormReason('');
    setFormError('');
  };

  const entries = Array.isArray(timeEntriesData) ? timeEntriesData : timeEntriesData?.data || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manual Time Approvals</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and audit offline or manual time submissions requiring manager authorization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log Manual Time</span>
            </button>
          </div>
        </div>

        {/* Status Tabs & Filters */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'APPROVED'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-white text-red-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === ''
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Entries Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading time entries...</div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs space-y-2">
              <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No time entries found</p>
              <p className="text-slate-400">No records match the current status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Project / Task</th>
                    <th className="py-3 px-4">Time Interval</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry: any) => {
                    const statusBadge =
                      entry.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : entry.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                    const start = new Date(entry.startTime);
                    const end = new Date(entry.endTime);

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                              {entry.employee?.firstName?.[0]}{entry.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{entry.employee?.displayName}</p>
                              <p className="text-[10px] text-slate-400">{entry.employee?.department?.name || 'Staff'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {entry.project ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: entry.project.color || '#3B82F6' }}
                              />
                              <div>
                                <span className="font-semibold text-slate-800">{entry.project.name}</span>
                                {entry.task && (
                                  <p className="text-[10px] text-slate-400">{entry.task.title}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">General / Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="font-medium">{start.toLocaleDateString()}</div>
                          <div className="text-[11px] text-slate-400">
                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {formatDuration(entry.durationSeconds)}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-700 leading-relaxed truncate">{entry.reason}</p>
                          {entry.rejectionReason && (
                            <p className="text-[10px] text-red-500 mt-0.5 italic">
                              Rejection: {entry.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge}`}>
                            {entry.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {entry.status === 'PENDING' && hasPermission('attendance.approve') ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => approveMutation.mutate(entry.id)}
                                disabled={approveMutation.isPending}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => setRejectEntryId(entry.id)}
                                className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {entry.reviewer ? `by ${entry.reviewer.firstName}` : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Log Manual Time */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-slate-900">Log Manual Time Entry</h3>
                <button
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    resetSubmitForm();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formStartTime || !formEndTime) {
                    setFormError('Start and end times are required');
                    return;
                  }
                  if (!formReason.trim()) {
                    setFormError('Please specify the justification or work completed');
                    return;
                  }

                  submitManualTimeMutation.mutate({
                    employeeId: formEmployeeId || undefined,
                    projectId: formProjectId || undefined,
                    startTime: new Date(formStartTime).toISOString(),
                    endTime: new Date(formEndTime).toISOString(),
                    reason: formReason.trim(),
                  });
                }}
                className="p-5 space-y-3.5"
              >
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                    {formError}
                  </div>
                )}

                {hasPermission('attendance.approve') && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Target Employee (Optional)</label>
                    <select
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Log for self</option>
                      {employees?.data?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project (Optional)</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None / General Admin</option>
                    {projects?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Start Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">End Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Reason / Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Offline client meeting at headquarters or power disruption..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitModalOpen(false);
                      resetSubmitForm();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitManualTimeMutation.isPending}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitManualTimeMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Reject Reason */}
        {rejectEntryId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-red-600">Reject Time Entry</h3>
                <button
                  onClick={() => {
                    setRejectEntryId(null);
                    setRejectionReason('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-600">
                  Provide a brief reason for rejecting this manual time submission:
                </p>

                <textarea
                  rows={3}
                  placeholder="e.g. Overlapping with existing tracked session or insufficient details..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectEntryId(null);
                      setRejectionReason('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={rejectMutation.isPending}
                    onClick={() => {
                      rejectMutation.mutate({ id: rejectEntryId, reason: rejectionReason });
                    }}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
