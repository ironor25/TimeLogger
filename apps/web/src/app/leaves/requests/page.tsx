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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Requests & Absences</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage employee paid time off, sick leaves, and vacation requests
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
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
              <div key={t.id} className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">{t.name}</p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <p className="text-lg font-bold text-slate-900">{t.daysAllowedPerYear} days/yr</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {t.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters & Status Bar */}
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
              All Requests
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

        {/* Requests Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading leave requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs space-y-2">
              <CalendarOff className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No leave requests found</p>
              <p className="text-slate-400">No records match your current filter settings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req: any) => {
                    const statusBadge =
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : req.status === 'CANCELLED'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                    const start = new Date(req.startDate);
                    const end = new Date(req.endDate);

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                              {req.employee?.firstName?.[0]}{req.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{req.employee?.displayName}</p>
                              <p className="text-[10px] text-slate-400">{req.employee?.department?.name || 'Staff'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{req.leaveType?.name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {req.leaveType?.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="font-medium">
                            {start.toLocaleDateString()} - {end.toLocaleDateString()}
                          </div>
                          {req.isHalfDay && (
                            <span className="text-[10px] text-blue-600 font-medium">Half Day</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {req.totalDays} day{req.totalDays > 1 ? 's' : ''}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-700 truncate">{req.reason}</p>
                          {req.rejectionReason && (
                            <p className="text-[10px] text-red-500 mt-0.5 italic">
                              Rejection: {req.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge}`}>
                            {req.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {req.status === 'PENDING' && hasPermission('leaves.approve') ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => approveMutation.mutate(req.id)}
                                disabled={approveMutation.isPending}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => setRejectRequestId(req.id)}
                                className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-slate-900">Apply for Leave</h3>
                <button
                  onClick={() => {
                    setIsApplyModalOpen(false);
                    resetApplyForm();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
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
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                    {formError}
                  </div>
                )}

                {hasPermission('leaves.approve') && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Employee (Optional)</label>
                    <select
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Apply for Self</option>
                      {employees?.data?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Leave Type *</label>
                  <select
                    required
                    value={formLeaveTypeId}
                    onChange={(e) => setFormLeaveTypeId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="text-xs font-semibold text-slate-700">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="halfDay"
                    checked={formHalfDay}
                    onChange={(e) => setFormHalfDay(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="halfDay" className="text-xs text-slate-700 font-medium">
                    Half day absence (0.5 day deduction)
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Reason / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Brief explanation for the leave request..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      resetApplyForm();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-red-600">Reject Leave Application</h3>
                <button
                  onClick={() => {
                    setRejectRequestId(null);
                    setRejectionReason('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-600">
                  State the reason for rejecting this leave request:
                </p>

                <textarea
                  rows={3}
                  placeholder="e.g. Critical release deadline during requested dates..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectRequestId(null);
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
                      rejectMutation.mutate({ id: rejectRequestId, reason: rejectionReason });
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
