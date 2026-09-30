'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  CalendarOff,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LeaveRequestsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [employeeId, setEmployeeId] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formHalfDay, setFormHalfDay] = useState(false);
  const [formReason, setFormReason] = useState('');
  const [formError, setFormError] = useState('');

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['leave-requests', { status: statusFilter, employeeId }],
    queryFn: () =>
      api.getLeaveRequests({
        status: statusFilter || undefined,
        employeeId: employeeId || undefined,
      }),
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.getLeaveTypes(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.rejectLeave(id, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setRejectRequestId(null);
      setRejectionReason('');
    },
  });

  const applyMutation = useMutation({
    mutationFn: (body: any) => api.applyLeave(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setIsApplyModalOpen(false);
      resetApplyForm();
    },
    onError: (err: any) => setFormError(err.message || 'Failed to submit leave request'),
  });

  const resetApplyForm = () => {
    setFormEmployeeId('');
    setFormLeaveTypeId('');
    setFormStartDate('');
    setFormEndDate('');
    setFormHalfDay(false);
    setFormReason('');
    setFormError('');
  };

  const requests = Array.isArray(requestsData) ? requestsData : requestsData?.data || [];
  const typesList = Array.isArray(leaveTypes) ? leaveTypes : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Leave Requests & Absences</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              Manage employee paid time off, sick leaves, and vacation requests
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white text-xs font-normal tracking-carbon transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {/* Quota Types Cards */}
        {typesList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {typesList.map((t: any) => (
              <div key={t.id} className="p-4 bg-white border border-[#e0e0e0]">
                <p className="text-[11px] font-semibold text-[#525252] uppercase tracking-carbon">{t.name}</p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <p className="text-xl font-light text-[#161616]">{t.daysAllowedPerYear} days/yr</p>
                  <span className={`text-[10px] px-1.5 py-0.5 border tracking-carbon ${
                    t.isPaid
                      ? 'bg-[#defbe6] text-[#0e6027] border-[#a7f0ba]'
                      : 'bg-[#f4f4f4] text-[#525252] border-[#e0e0e0]'
                  }`}>
                    {t.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters & Status Bar */}
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
              All Requests
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

        {/* Requests Table */}
        <div className="bg-white border border-[#e0e0e0] overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading leave requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-16 text-center text-[#525252] text-xs space-y-2 tracking-carbon">
              <CalendarOff className="w-8 h-8 text-[#8c8c8c] mx-auto" />
              <p className="font-semibold text-[#161616]">No leave requests found</p>
              <p className="text-[#8c8c8c]">No records match your current filter settings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tracking-carbon">
                <thead className="bg-[#f4f4f4] text-[#525252] font-semibold border-b border-[#e0e0e0] uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4 font-mono">Days</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {requests.map((req: any) => {
                    const statusBadge =
                      req.status === 'APPROVED'
                        ? 'bg-[#defbe6] text-[#0e6027] border-[#a7f0ba]'
                        : req.status === 'REJECTED'
                        ? 'bg-[#ffebee] text-[#da1e28] border-[#ffb3ba]'
                        : req.status === 'CANCELLED'
                        ? 'bg-[#f4f4f4] text-[#525252] border-[#e0e0e0]'
                        : 'bg-[#fdf2cc] text-[#6d4f00] border-[#fbe499]';

                    const start = new Date(req.startDate);
                    const end = new Date(req.endDate);

                    return (
                      <tr key={req.id} className="hover:bg-[#f4f4f4] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-[#edf5ff] border border-[#a6c8ff] text-[#0043ce] font-semibold text-xs flex items-center justify-center">
                              {req.employee?.firstName?.[0]}{req.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-[#161616]">{req.employee?.displayName}</p>
                              <p className="text-[10px] text-[#525252]">{req.employee?.department?.name || 'Staff'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-[#161616]">{req.leaveType?.name}</span>
                          <span className="text-[10px] text-[#525252] block">
                            {req.leaveType?.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#161616]">
                          <div className="font-normal">
                            {start.toLocaleDateString()} - {end.toLocaleDateString()}
                          </div>
                          {req.isHalfDay && (
                            <span className="text-[10px] text-[#0f62fe] font-medium">Half Day</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-[#161616]">
                          {req.totalDays} day{req.totalDays > 1 ? 's' : ''}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-[#161616] truncate">{req.reason}</p>
                          {req.rejectionReason && (
                            <p className="text-[10px] text-[#da1e28] mt-0.5 italic">
                              Rejection: {req.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] px-2 py-0.5 border ${statusBadge}`}>
                            {req.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {req.status === 'PENDING' && hasPermission('leaves.approve') ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => approveMutation.mutate(req.id)}
                                disabled={approveMutation.isPending}
                                className="px-3 py-1 bg-[#24a148] hover:bg-[#1e8a3d] text-white font-normal text-xs transition-colors flex items-center gap-1 tracking-carbon"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => setRejectRequestId(req.id)}
                                className="px-3 py-1 bg-[#ffebee] hover:bg-[#ffd7dc] text-[#da1e28] border border-[#ffb3ba] font-normal text-xs transition-colors flex items-center gap-1 tracking-carbon"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8c8c8c] font-mono">
                              {req.reviewer ? `Reviewed by ${req.reviewer.firstName}` : '-'}
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

        {/* Modal: Apply for Leave */}
        {isApplyModalOpen && (
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#161616] tracking-carbon">Apply for Leave</h3>
                <button
                  onClick={() => {
                    setIsApplyModalOpen(false);
                    resetApplyForm();
                  }}
                  className="p-1 text-[#525252] hover:text-[#161616]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formLeaveTypeId) {
                    setFormError('Please select a leave category');
                    return;
                  }
                  if (!formStartDate || !formEndDate) {
                    setFormError('Start and end dates are required');
                    return;
                  }

                  applyMutation.mutate({
                    employeeId: formEmployeeId || undefined,
                    leaveTypeId: formLeaveTypeId,
                    startDate: new Date(formStartDate).toISOString(),
                    endDate: new Date(formEndDate).toISOString(),
                    isHalfDay: formHalfDay,
                    reason: formReason.trim() || undefined,
                  });
                }}
                className="p-5 space-y-3.5"
              >
                {formError && (
                  <div className="p-2.5 bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {formError}
                  </div>
                )}

                {hasPermission('leaves.approve') && (
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Employee (Optional)</label>
                    <select
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    >
                      <option value="">Apply for Self</option>
                      {employees?.data?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Leave Type *</label>
                  <select
                    required
                    value={formLeaveTypeId}
                    onChange={(e) => setFormLeaveTypeId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  >
                    <option value="">Select Leave Type...</option>
                    {typesList.map((lt: any) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.isPaid ? 'Paid' : 'Unpaid'} - {lt.daysAllowedPerYear} days/yr)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="halfDay"
                    checked={formHalfDay}
                    onChange={(e) => setFormHalfDay(e.target.checked)}
                    className="rounded-none border-[#e0e0e0] text-[#0f62fe] focus:ring-[#0f62fe]"
                  />
                  <label htmlFor="halfDay" className="text-xs text-[#161616] font-normal tracking-carbon">
                    Half day absence (0.5 day deduction)
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Reason / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Brief explanation for the leave request..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] resize-none tracking-carbon"
                  />
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      resetApplyForm();
                    }}
                    className="px-4 py-2 text-xs font-normal border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] tracking-carbon transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="px-4 py-2 text-xs font-normal bg-[#0f62fe] text-white hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-50 tracking-carbon transition-colors"
                  >
                    {applyMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Reject Leave Reason */}
        {rejectRequestId && (
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#da1e28] tracking-carbon">Reject Leave Application</h3>
                <button
                  onClick={() => {
                    setRejectRequestId(null);
                    setRejectionReason('');
                  }}
                  className="p-1 text-[#525252] hover:text-[#161616]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-xs text-[#525252] tracking-carbon">
                  State the reason for rejecting this leave request:
                </p>

                <textarea
                  rows={3}
                  placeholder="e.g. Critical release deadline during requested dates..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#da1e28] resize-none tracking-carbon"
                />

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectRequestId(null);
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
                      rejectMutation.mutate({ id: rejectRequestId, reason: rejectionReason });
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
