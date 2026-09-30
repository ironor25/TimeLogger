'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  CalendarRange,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function WorkSchedulesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  // Create form state
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [expectedWeeklyHours, setExpectedWeeklyHours] = useState('40');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState('15');
  const [isFlexible, setIsFlexible] = useState(false);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [formError, setFormError] = useState('');

  // Assign form state
  const [assignScheduleId, setAssignScheduleId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assignError, setAssignError] = useState('');

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['work-schedules'],
    queryFn: () => api.getSchedules(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const createScheduleMutation = useMutation({
    mutationFn: (body: any) => api.createSchedule(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => setFormError(err.message || 'Failed to create work schedule'),
  });

  const assignMutation = useMutation({
    mutationFn: (body: any) => api.assignSchedule(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
      setIsAssignModalOpen(false);
      setSelectedEmployeeIds([]);
    },
    onError: (err: any) => setAssignError(err.message || 'Failed to assign employees'),
  });

  const resetCreateForm = () => {
    setName('');
    setStartTime('09:00');
    setEndTime('18:00');
    setExpectedWeeklyHours('40');
    setGracePeriodMinutes('15');
    setIsFlexible(false);
    setWorkingDays([1, 2, 3, 4, 5]);
    setFormError('');
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleDay = (dayIndex: number) => {
    if (workingDays.includes(dayIndex)) {
      setWorkingDays(workingDays.filter((d) => d !== dayIndex));
    } else {
      setWorkingDays([...workingDays, dayIndex].sort());
    }
  };

  const scheduleList = Array.isArray(schedules) ? schedules : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Work Shifts & Schedules</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              Define core working hours, weekly expectations, grace periods, and shift assignments
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('settings.edit') && (
              <>
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] text-xs font-normal tracking-carbon transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-[#525252]" />
                  <span>Assign Shift</span>
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white text-xs font-normal tracking-carbon transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Shift</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Schedules Grid */}
        {isLoading ? (
          <div className="bg-white border border-[#e0e0e0] p-16 text-center text-xs text-[#8c8c8c] tracking-carbon">
            Loading work schedules...
          </div>
        ) : scheduleList.length === 0 ? (
          <div className="bg-white border border-[#e0e0e0] p-16 text-center text-[#525252] text-xs space-y-2 tracking-carbon">
            <CalendarRange className="w-8 h-8 text-[#8c8c8c] mx-auto" />
            <p className="font-semibold text-[#161616]">No work shifts defined</p>
            <p className="text-[#8c8c8c]">Create a work shift to establish expected hours and attendance rules.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduleList.map((s: any) => {
              const activeCount = s._count?.assignments || s.assignments?.length || 0;
              const days = Array.isArray(s.workingDays) ? s.workingDays : [1, 2, 3, 4, 5];

              return (
                <div
                  key={s.id}
                  className="bg-white border border-[#e0e0e0] p-5 space-y-4 hover:border-[#0f62fe] transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#edf5ff] border border-[#a6c8ff] flex items-center justify-center text-[#0043ce]">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[#161616] tracking-carbon">{s.name}</h3>
                          <p className="text-[11px] text-[#525252] tracking-carbon">
                            {s.isFlexible ? 'Flexible Schedule' : 'Fixed Hours Shift'}
                          </p>
                        </div>
                      </div>

                      {s.isDefault && (
                        <span className="text-[10px] px-2 py-0.5 bg-[#edf5ff] text-[#0043ce] border border-[#a6c8ff] tracking-carbon">
                          Default
                        </span>
                      )}
                    </div>

                    {/* Shift Time Info */}
                    <div className="bg-[#f4f4f4] p-3 border border-[#e0e0e0] space-y-2 text-xs tracking-carbon">
                      <div className="flex justify-between text-[#525252]">
                        <span>Shift Timing:</span>
                        <span className="font-semibold text-[#161616] font-mono">
                          {s.startTime || '09:00'} - {s.endTime || '18:00'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#525252]">
                        <span>Weekly Target:</span>
                        <span className="font-semibold text-[#161616] font-mono">{s.expectedWeeklyHours || 40} Hours</span>
                      </div>
                      <div className="flex justify-between text-[#525252]">
                        <span>Late Grace Window:</span>
                        <span className="font-semibold text-[#161616] font-mono">{s.gracePeriodMinutes || 15} Mins</span>
                      </div>
                    </div>

                    {/* Working Days Badges */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-carbon">Working Days</span>
                      <div className="flex gap-1">
                        {dayNames.map((d, idx) => {
                          const isWorking = days.includes(idx);
                          return (
                            <span
                              key={idx}
                              className={`text-[10px] px-1.5 py-0.5 tracking-carbon ${
                                isWorking
                                  ? 'bg-[#0f62fe] text-white'
                                  : 'bg-[#f4f4f4] text-[#8c8c8c] border border-[#e0e0e0]'
                              }`}
                            >
                              {d}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-[#e0e0e0] flex items-center justify-between text-xs text-[#525252] tracking-carbon">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#8c8c8c]" />
                      <strong className="text-[#161616] font-mono">{activeCount}</strong> assigned
                    </span>

                    {hasPermission('settings.edit') && (
                      <button
                        onClick={() => {
                          setAssignScheduleId(s.id);
                          setIsAssignModalOpen(true);
                        }}
                        className="text-[#0f62fe] hover:text-[#0043ce] font-normal text-xs tracking-carbon transition-colors"
                      >
                        Assign staff &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Work Schedule */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#161616] tracking-carbon">Create Work Shift Schedule</h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  className="p-1 text-[#525252] hover:text-[#161616]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) {
                    setFormError('Shift name is required');
                    return;
                  }
                  createScheduleMutation.mutate({
                    name: name.trim(),
                    startTime,
                    endTime,
                    expectedWeeklyHours: parseFloat(expectedWeeklyHours) || 40,
                    gracePeriodMinutes: parseInt(gracePeriodMinutes, 10) || 15,
                    isFlexible,
                    workingDays,
                  });
                }}
                className="p-5 space-y-3.5"
              >
                {formError && (
                  <div className="p-2.5 bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Shift Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Morning Shift (9am - 6pm)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Expected Weekly Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={expectedWeeklyHours}
                      onChange={(e) => setExpectedWeeklyHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Grace Period (Minutes)</label>
                    <input
                      type="number"
                      value={gracePeriodMinutes}
                      onChange={(e) => setGracePeriodMinutes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon font-mono"
                    />
                  </div>
                </div>

                {/* Working Days selector */}
                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Working Days</label>
                  <div className="flex gap-1.5 pt-1">
                    {dayNames.map((day, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => toggleDay(idx)}
                        className={`flex-1 py-1.5 text-xs font-normal border transition-colors tracking-carbon ${
                          workingDays.includes(idx)
                            ? 'bg-[#0f62fe] text-white border-[#0f62fe]'
                            : 'bg-[#f4f4f4] text-[#525252] border-[#e0e0e0] hover:bg-[#e0e0e0]'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="flexible"
                    checked={isFlexible}
                    onChange={(e) => setIsFlexible(e.target.checked)}
                    className="rounded-none border-[#e0e0e0] text-[#0f62fe] focus:ring-[#0f62fe]"
                  />
                  <label htmlFor="flexible" className="text-xs text-[#161616] font-normal tracking-carbon">
                    Flexible Shift (Allows working anytime to meet weekly quota)
                  </label>
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetCreateForm();
                    }}
                    className="px-4 py-2 text-xs font-normal border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] tracking-carbon transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createScheduleMutation.isPending}
                    className="px-4 py-2 text-xs font-normal bg-[#0f62fe] text-white hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-50 tracking-carbon transition-colors"
                  >
                    {createScheduleMutation.isPending ? 'Creating...' : 'Create Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Assign Shift to Employees */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#161616] tracking-carbon">Assign Shift to Employees</h3>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="p-1 text-[#525252] hover:text-[#161616]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const targetScheduleId = assignScheduleId || scheduleList[0]?.id;
                  if (!targetScheduleId) {
                    setAssignError('Please select a shift');
                    return;
                  }
                  if (selectedEmployeeIds.length === 0) {
                    setAssignError('Please select at least one employee');
                    return;
                  }

                  assignMutation.mutate({
                    scheduleId: targetScheduleId,
                    employeeIds: selectedEmployeeIds,
                    effectiveFrom: new Date().toISOString(),
                  });
                }}
                className="p-5 space-y-3.5"
              >
                {assignError && (
                  <div className="p-2.5 bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {assignError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Target Shift *</label>
                  <select
                    required
                    value={assignScheduleId}
                    onChange={(e) => setAssignScheduleId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  >
                    <option value="">Choose shift...</option>
                    {scheduleList.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Select Employees *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = employees?.data?.map((e: any) => e.id) || [];
                        setSelectedEmployeeIds(
                          selectedEmployeeIds.length === allIds.length ? [] : allIds,
                        );
                      }}
                      className="text-[11px] text-[#0f62fe] hover:text-[#0043ce] font-normal tracking-carbon"
                    >
                      {selectedEmployeeIds.length === (employees?.data?.length || 0)
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-[#e0e0e0] p-2 space-y-1 bg-[#f4f4f4]">
                    {employees?.data?.map((emp: any) => {
                      const isChecked = selectedEmployeeIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white cursor-pointer text-xs tracking-carbon transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                              } else {
                                setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded-none border-[#e0e0e0] text-[#0f62fe] focus:ring-[#0f62fe]"
                          />
                          <span className="font-semibold text-[#161616]">{emp.displayName}</span>
                          <span className="text-[11px] text-[#525252]">
                            ({emp.department?.name || 'General'})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 text-xs font-normal border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] tracking-carbon transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignMutation.isPending}
                    className="px-4 py-2 text-xs font-normal bg-[#0f62fe] text-white hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-50 tracking-carbon transition-colors"
                  >
                    {assignMutation.isPending ? 'Assigning...' : `Assign ${selectedEmployeeIds.length} Staff`}
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
