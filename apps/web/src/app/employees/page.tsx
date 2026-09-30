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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Employee Directory</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">Manage team members, roles, work schedules, and device linkages</p>
          </div>
          {hasPermission('employees.create') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white rounded-none text-xs font-normal tracking-carbon transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 border border-[#e0e0e0] rounded-none flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8c8c]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, code..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] text-[#161616] tracking-carbon"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white border border-[#e0e0e0] rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f4f4] text-[#525252] text-[11px] font-normal uppercase tracking-wider border-b border-[#e0e0e0]">
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
              <tbody className="divide-y divide-[#e0e0e0] text-[#161616]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#8c8c8c] tracking-carbon">Loading employees...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#8c8c8c] tracking-carbon">No employees match the criteria.</td>
                  </tr>
                ) : (
                  employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-[#f4f4f4] transition-colors">
                      <td className="px-5 py-3 font-normal">
                        <Link href={`/employees/${emp.id}`} className="font-medium text-[#161616] hover:text-[#0f62fe] hover:underline">
                          {emp.displayName}
                        </Link>
                        <div className="text-[11px] text-[#8c8c8c]">{emp.email} • {emp.employeeCode}</div>
                      </td>
                      <td className="px-5 py-3 text-[#525252]">{emp.department || '-'}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-none bg-[#f4f4f4] border border-[#e0e0e0] text-[#525252] text-[10px] font-normal">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {emp.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 text-[#24a148] text-[11px] font-normal">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#24a148]" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[#8c8c8c] text-[11px] font-normal">
                            <XCircle className="w-3.5 h-3.5 text-[#8c8c8c]" />
                            {emp.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {emp.workStatus === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 text-[#0e6027] text-[10px] font-normal bg-[#defbe6] px-2 py-0.5 rounded-none border border-[#a7f0ba]">
                            <span className="w-1.5 h-1.5 bg-[#24a148]"></span> Working
                          </span>
                        )}
                        {emp.workStatus === 'ON_BREAK' && (
                          <span className="inline-flex items-center gap-1.5 text-[#6d4f00] text-[10px] font-normal bg-[#fdf2cc] px-2 py-0.5 rounded-none border border-[#fbe499]">
                            On Break
                          </span>
                        )}
                        {emp.workStatus === 'OFFLINE' && (
                          <span className="text-[#8c8c8c] text-[11px]">Offline</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#525252]">
                        {emp.lastDevice ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Laptop className="w-3 h-3 text-[#8c8c8c]" />
                            {emp.lastDevice.deviceName}
                          </span>
                        ) : (
                          <span className="text-[#8c8c8c]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="text-xs font-normal text-[#0f62fe] hover:text-[#0043ce] hover:underline tracking-carbon"
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
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-none border border-[#e0e0e0] max-w-lg w-full p-6 relative">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute right-4 top-4 text-[#8c8c8c] hover:text-[#161616]"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-base font-medium text-[#161616] mb-1">Add New Employee</h2>
              <p className="text-xs text-[#525252] mb-4 tracking-carbon">Create employee profile, user credentials, and assign work schedule</p>

              {formError && (
                <div className="mb-4 p-2.5 bg-[#ffebee] text-[#da1e28] text-xs rounded-none border border-[#ffb3ba]">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">Employee Code</label>
                    <input
                      type="text"
                      required
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">Department</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
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
                    <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">Email (Login Identity)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">System Role</label>
                    <select
                      value={formData.roleName}
                      onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">Work Schedule</label>
                    <select
                      value={formData.workScheduleId}
                      onChange={(e) => setFormData({ ...formData, workScheduleId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
                    >
                      <option value="">Default Organization Schedule</option>
                      {schedules?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-normal text-[#525252] hover:bg-[#f4f4f4] rounded-none tracking-carbon"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal rounded-none disabled:opacity-50 tracking-carbon"
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
