'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  Users,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Shield,
  Clock,
  Laptop,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employeeCode: `EMP-0${Math.floor(100 + Math.random() * 900)}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    roleName: 'EMPLOYEE',
    workScheduleId: '',
    timezone: 'Asia/Kolkata',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', { search, departmentId, status }],
    queryFn: () => api.getEmployees({ search, departmentId, status, limit: 50 }),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.getDepartments(),
  });

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.getSchedules(),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
  });

  const createMutation = useMutation({
    mutationFn: (newEmp: any) => api.createEmployee(newEmp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsCreateOpen(false);
      setFormData({
        employeeCode: `EMP-0${Math.floor(100 + Math.random() * 900)}`,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: '',
        roleName: 'EMPLOYEE',
        workScheduleId: '',
        timezone: 'Asia/Kolkata',
      });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create employee');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate(formData);
  };

  const employees = employeesData?.data || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage team members, roles, work schedules, and device linkages</p>
          </div>
          {hasPermission('employees.create') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, code..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Departments</option>
              {departments?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Work State</th>
                  <th className="px-5 py-3">Last Device</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading employees...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No employees match the criteria.</td>
                  </tr>
                ) : (
                  employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">
                          <Link href={`/employees/${emp.id}`} className="hover:text-blue-600 hover:underline">
                            {emp.displayName}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-400">{emp.email} • {emp.employeeCode}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{emp.department || '-'}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {emp.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            {emp.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {emp.workStatus === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Working
                          </span>
                        )}
                        {emp.workStatus === 'ON_BREAK' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 text-[10px] font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            On Break
                          </span>
                        )}
                        {emp.workStatus === 'OFFLINE' && (
                          <span className="text-slate-400 text-[11px]">Offline</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {emp.lastDevice ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Laptop className="w-3 h-3 text-slate-400" />
                            {emp.lastDevice.deviceName}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Employee Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-base font-bold text-slate-900 mb-1">Add New Employee</h2>
              <p className="text-xs text-slate-500 mb-4">Create employee profile, user credentials, and assign work schedule</p>

              {formError && (
                <div className="mb-4 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      required
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Select Department</option>
                      {departments?.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email (Login Identity)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">System Role</label>
                    <select
                      value={formData.roleName}
                      onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Work Schedule</label>
                    <select
                      value={formData.workScheduleId}
                      onChange={(e) => setFormData({ ...formData, workScheduleId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Default Organization Schedule</option>
                      {schedules?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Saving...' : 'Create Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
