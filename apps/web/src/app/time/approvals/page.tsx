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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Manual Time Approvals</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              Review and audit offline or manual time submissions requiring manager authorization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white text-xs font-normal tracking-carbon transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log Manual Time</span>
            </button>
          </div>
        </div>

        {/* Status Tabs & Filters */}
        <div className="bg-white border border-[#e0e0e0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center border border-[#e0e0e0] bg-[#f4f4f4] text-xs font-normal tracking-carbon">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-[#0f62fe] text-white font-medium'
                  : 'text-[#525252] hover:text-[#161616]'
              }`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-[#0f62fe] text-white font-medium'
                  : 'text-[#525252] hover:text-[#161616]'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 transition-colors ${
                statusFilter === 'REJECTED'
                  ? 'bg-[#0f62fe] text-white font-medium'
                  : 'text-[#525252] hover:text-[#161616]'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 transition-colors ${
                statusFilter === ''
                  ? 'bg-[#0f62fe] text-white font-medium'
                  : 'text-[#525252] hover:text-[#161616]'
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#f4f4f4] border border-[#e0e0e0] px-3 py-1.5 text-xs">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
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
        <div className="bg-white border border-[#e0e0e0] overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading time entries...</div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center text-[#525252] text-xs space-y-2 tracking-carbon">
              <FileCheck className="w-8 h-8 text-[#8c8c8c] mx-auto" />
              <p className="font-semibold text-[#161616]">No time entries found</p>
              <p className="text-[#8c8c8c]">No records match the current status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tracking-carbon">
                <thead className="bg-[#f4f4f4] text-[#525252] font-semibold border-b border-[#e0e0e0] uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Project / Task</th>
                    <th className="py-3 px-4">Time Interval</th>
                    <th className="py-3 px-4 font-mono">Duration</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {entries.map((entry: any) => {
                    const statusBadge =
                      entry.status === 'APPROVED'
                        ? 'bg-[#defbe6] text-[#0e6027] border-[#a7f0ba]'
                        : entry.status === 'REJECTED'
                        ? 'bg-[#ffebee] text-[#da1e28] border-[#ffb3ba]'
                        : 'bg-[#fdf2cc] text-[#6d4f00] border-[#fbe499]';

                    const start = new Date(entry.startTime);
                    const end = new Date(entry.endTime);

                    return (
                      <tr key={entry.id} className="hover:bg-[#f4f4f4] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-[#edf5ff] border border-[#a6c8ff] text-[#0043ce] font-semibold text-xs flex items-center justify-center">
                              {entry.employee?.firstName?.[0]}{entry.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-[#161616]">{entry.employee?.displayName}</p>
                              <p className="text-[10px] text-[#525252]">{entry.employee?.department?.name || 'Staff'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {entry.project ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 shrink-0"
                                style={{ backgroundColor: entry.project.color || '#0f62fe' }}
                              />
                              <div>
                                <span className="font-semibold text-[#161616]">{entry.project.name}</span>
                                {entry.task && (
                                  <p className="text-[10px] text-[#525252]">{entry.task.title}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#8c8c8c] italic">General / Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#161616]">
                          <div className="font-normal">{start.toLocaleDateString()}</div>
                          <div className="text-[11px] text-[#525252] font-mono">
                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-[#161616]">
                          {formatDuration(entry.durationSeconds)}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-[#161616] leading-relaxed truncate">{entry.reason}</p>
                          {entry.rejectionReason && (
                            <p className="text-[10px] text-[#da1e28] mt-0.5 italic">
                              Rejection: {entry.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] px-2 py-0.5 border ${statusBadge}`}>
                            {entry.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {entry.status === 'PENDING' && hasPermission('attendance.approve') ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => approveMutation.mutate(entry.id)}
                                disabled={approveMutation.isPending}
                                className="px-3 py-1 bg-[#24a148] hover:bg-[#1e8a3d] text-white font-normal text-xs transition-colors flex items-center gap-1 tracking-carbon"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => setRejectEntryId(entry.id)}
                                className="px-3 py-1 bg-[#ffebee] hover:bg-[#ffd7dc] text-[#da1e28] border border-[#ffb3ba] font-normal text-xs transition-colors flex items-center gap-1 tracking-carbon"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8c8c8c] font-mono">
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
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#161616] tracking-carbon">Log Manual Time Entry</h3>
                <button
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    resetSubmitForm();
                  }}
                  className="p-1 text-[#525252] hover:text-[#161616]"
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
                  <div className="p-2.5 bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {formError}
                  </div>
                )}

                {hasPermission('attendance.approve') && (
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Target Employee (Optional)</label>
                    <select
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    >
                      <option value="">Log for self</option>
                      {employees?.data?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Project (Optional)</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  >
                    <option value="">None / General Admin</option>
                    {projects?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Start Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">End Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Reason / Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Offline client meeting at headquarters or power disruption..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] resize-none tracking-carbon"
                  />
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitModalOpen(false);
                      resetSubmitForm();
                    }}
                    className="px-4 py-2 text-xs font-normal border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] tracking-carbon transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitManualTimeMutation.isPending}
                    className="px-4 py-2 text-xs font-normal bg-[#0f62fe] text-white hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-50 tracking-carbon transition-colors"
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
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#da1e28] tracking-carbon">Reject Time Entry</h3>
                <button
                  onClick={() => {
                    setRejectEntryId(null);
                    setRejectionReason('');
                  }}
                  className="p-1 text-[#525252] hover:text-[#161616]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-xs text-[#525252] tracking-carbon">
                  Provide a brief reason for rejecting this manual time submission:
                </p>

                <textarea
                  rows={3}
                  placeholder="e.g. Overlapping with existing tracked session or insufficient details..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#da1e28] resize-none tracking-carbon"
                />

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectEntryId(null);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 text-xs font-normal border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] tracking-carbon transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={rejectMutation.isPending}
                    onClick={() => {
                      rejectMutation.mutate({ id: rejectEntryId, reason: rejectionReason });
                    }}
                    className="px-4 py-2 text-xs font-normal bg-[#da1e28] text-white hover:bg-[#b81922] disabled:opacity-50 tracking-carbon transition-colors"
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
