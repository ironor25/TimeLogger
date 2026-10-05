'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  Calendar,
  User,
  Search,
  Trash2,
  Maximize2,
  X,
  Edit2,
  Check,
  Clock,
  Laptop,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

function TimelinesPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { hasPermission, organization, role, employee } = useAuth();
  const isEmployeeRole = role === 'EMPLOYEE';

  const initialEmpId = isEmployeeRole ? (employee?.id || '') : (searchParams.get('employeeId') || '');
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [employeeId, setEmployeeId] = useState(initialEmpId);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeScreenshot, setActiveScreenshot] = useState<any | null>(null);

  // Notes editing state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');

  // 1. Fetch Employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
    enabled: !isEmployeeRole,
  });

  const employeeList: any[] = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.data || [];

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employeeList;
    const lower = searchTerm.toLowerCase();
    return employeeList.filter(
      (emp) =>
        emp.displayName?.toLowerCase().includes(lower) ||
        emp.employeeCode?.toLowerCase().includes(lower) ||
        emp.email?.toLowerCase().includes(lower),
    );
  }, [employeeList, searchTerm]);

  // Selected employee ID (locked to logged in employee if EMPLOYEE role)
  const effectiveEmpId = isEmployeeRole
    ? (employee?.id || '')
    : (employeeId || searchParams.get('employeeId') || (employeeList.length > 0 ? employeeList[0].id : ''));

  // 2. Fetch Timeline Data for Selected Employee & Date
  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['timeline', effectiveEmpId, selectedDate],
    queryFn: () => api.getTimeline({ employeeId: effectiveEmpId || undefined, date: selectedDate }),
    enabled: !isEmployeeRole || !!employee?.id,
  });

  // 3. Delete Session Mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => api.deleteWorkSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  // 4. Update Notes Mutation
  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.updateWorkSessionNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setEditingSessionId(null);
    },
  });

  // 5. Delete Screenshot Mutation
  const deleteScreenshotMutation = useMutation({
    mutationFn: (id: string) => api.deleteScreenshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setActiveScreenshot(null);
    },
  });

  const summary = timelineData?.summary;
  const sessions: any[] = timelineData?.sessions || [];

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch {
      return dateStr;
    }
  };

  const formatTimeRange = (startedAt: string, endedAt?: string | null, durSec: number = 0) => {
    const startStr = new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const endStr = endedAt
      ? new Date(endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : 'Active';

    const hrs = Math.floor(durSec / 3600);
    const mins = Math.floor((durSec % 3600) / 60);
    const durFormatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    return {
      startStr,
      endStr,
      durFormatted,
    };
  };

  const handleStartEditNotes = (session: any) => {
    setEditingSessionId(session.id);
    setNotesInput(session.notes || '');
  };

  const handleSaveNotes = (sessionId: string) => {
    updateNotesMutation.mutate({ id: sessionId, notes: notesInput });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header & Search / Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Visual Work Timelines</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              {isEmployeeRole
                ? 'Personal session telemetry, activity breakdowns, breaks, and periodic screen captures'
                : 'Employee session telemetry, activity breakdowns, breaks, and periodic screen captures'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Employee Search & Selector */}
            {!isEmployeeRole ? (
              <div className="flex items-center gap-2 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5">
                <User className="w-3.5 h-3.5 text-[#525252] shrink-0" />
                <div className="relative">
                  <select
                    value={effectiveEmpId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal cursor-pointer pr-4 tracking-carbon"
                  >
                    {filteredEmployees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.displayName} ({emp.employeeCode || emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs text-[#161616]">
                <User className="w-3.5 h-3.5 text-[#0f62fe] shrink-0" />
                <span className="font-semibold tracking-carbon">{employee?.displayName || 'My Timeline'}</span>
                {(employee?.employeeCode || employee?.email) && (
                  <span className="text-[10px] text-[#8c8c8c] font-mono">
                    ({employee.employeeCode || employee.email})
                  </span>
                )}
              </div>
            )}


            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#525252] shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="focus:outline-none text-[#161616] text-xs font-medium bg-transparent cursor-pointer tracking-carbon"
              />
            </div>
          </div>
        </div>

        {/* 6 Top Metric Cards (Carbon Styling) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Time Worked */}
          <div className="bg-white border border-[#e0e0e0] p-4 rounded-none flex flex-col justify-between min-h-[96px]">
            <div className="text-2xl font-light text-[#0f62fe] tracking-tight">
              {summary?.formattedWorked || '0h'}
            </div>
            <div className="text-xs font-normal text-[#525252] mt-1 tracking-carbon">Time Worked</div>
          </div>

          {/* 2. Timer Active */}
          <div className="bg-white border border-[#e0e0e0] p-4 rounded-none flex flex-col justify-between min-h-[96px]">
            <div className="text-2xl font-light text-[#24a148] tracking-tight">
              {summary?.formattedTimerActive || '0h'}
            </div>
            <div className="text-xs font-normal text-[#525252] mt-1 tracking-carbon">Timer (Active)</div>
          </div>

          {/* 3. Manual Entry */}
          <div className="bg-white border border-[#e0e0e0] p-4 rounded-none flex flex-col justify-between min-h-[96px]">
            <div className="text-2xl font-light text-[#6d4f00] tracking-tight">
              {summary?.formattedManual || '0h'}
            </div>
            <div className="text-xs font-normal text-[#525252] mt-1 tracking-carbon">Manual Entry</div>
          </div>

          {/* 4. Meeting / Break Hours */}
          <div className="bg-white border border-[#e0e0e0] p-4 rounded-none flex flex-col justify-between min-h-[96px]">
            <div className="text-2xl font-light text-[#0043ce] tracking-tight">
              {(summary?.breakSeconds > 0
                ? summary?.formattedBreak
                : summary?.meetingSeconds > 0
                ? summary?.formattedMeeting
                : summary?.formattedBreak || '0h')}
            </div>
            <div className="text-xs font-normal text-[#525252] mt-1 tracking-carbon">Break / Meeting</div>
          </div>

          {/* 5. Idle Time */}
          <div className="bg-white border border-[#e0e0e0] p-4 rounded-none flex flex-col justify-between min-h-[96px]">
            <div className="text-2xl font-light text-[#da1e28] tracking-tight">
              {summary?.formattedIdle || '0h'}
            </div>
            <div className="text-xs font-normal text-[#525252] mt-1 tracking-carbon">Idle Time</div>
          </div>

          {/* 6. Employees Worked */}
          <div className="bg-white border border-[#e0e0e0] p-4 rounded-none flex flex-col justify-between min-h-[96px]">
            <div className="text-2xl font-light text-[#161616] tracking-tight">
              {isEmployeeRole
                ? (sessions.length > 0 ? 1 : 0)
                : (summary?.employeesWorkedCount ?? (sessions.length > 0 ? 1 : 0))}
            </div>
            <div className="text-xs font-normal text-[#525252] mt-1 tracking-carbon">
              {isEmployeeRole ? 'Personal Staff' : 'Staff Count'}
            </div>
          </div>
        </div>

        {/* Work Sessions List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-none border border-[#e0e0e0] p-12 text-center text-[#8c8c8c] text-xs tracking-carbon">
              Loading timeline work sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-none border border-[#e0e0e0] p-12 text-center text-[#525252] space-y-2">
              <AlertCircle className="w-8 h-8 text-[#8c8c8c] mx-auto" />
              <div className="font-medium text-[#161616]">No work sessions recorded for this day</div>
              <p className="text-xs text-[#525252] tracking-carbon">
                Start tracking with the PulseTime desktop agent to capture real-time sessions and screenshots.
              </p>
            </div>
          ) : (
            sessions.map((session: any) => {
              const { startStr, endStr, durFormatted } = formatTimeRange(
                session.startedAt,
                session.endedAt,
                session.durationSeconds,
              );

              const employeeName = session.employee?.displayName || 'Employee';
              const projectName = session.project?.name || 'General';
              const taskTitle = session.task?.title || 'General Activity';
              const ipAddr = session.ipAddress || '127.0.0.1';

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-none border border-[#e0e0e0] p-5 space-y-4 hover:border-[#8c8c8c] transition-colors"
                >
                  {/* Row 1: Date, Time & Delete Session */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#e0e0e0] pb-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#161616]">
                      <span>
                        <strong className="font-medium text-[#161616]">Date:</strong>{' '}
                        <span className="text-[#525252]">{formatDateHeader(session.startedAt)}</span>
                      </span>
                      <span>
                        <strong className="font-medium text-[#161616]">Time:</strong>{' '}
                        <span className="text-[#525252]">
                          {startStr} → {endStr} ({durFormatted})
                        </span>
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to delete this session (${startStr} → ${endStr})? This will also remove associated screenshots.`,
                          )
                        ) {
                          deleteSessionMutation.mutate(session.id);
                        }
                      }}
                      className="text-[#da1e28] hover:text-[#ba1b23] hover:underline text-xs font-normal self-start sm:self-auto cursor-pointer transition-colors flex items-center gap-1 tracking-carbon"
                    >
                      <span>Delete Session</span>
                    </button>
                  </div>

                  {/* Row 2: Employee, Project, Task, IP */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[#161616]">
                    <div>
                      <span className="font-medium text-[#161616]">Employee: </span>
                      <span className="text-[#525252]">{employeeName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-[#161616]">Project: </span>
                      <span className="text-[#525252]">{projectName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-[#161616]">Task: </span>
                      <span className="text-[#525252]">{taskTitle}</span>
                    </div>
                    <div>
                      <span className="font-medium text-[#161616]">IP: </span>
                      <span className="text-[#525252]">{ipAddr}</span>
                    </div>
                  </div>

                  {/* Row 3: Notes (with inline edit) */}
                  <div className="text-xs text-[#161616] flex items-center gap-2">
                    <span className="font-medium text-[#161616]">Notes:</span>
                    {editingSessionId === session.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Enter session memo notes..."
                          className="px-3 py-1 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] min-w-[220px] tracking-carbon"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNotes(session.id)}
                          className="px-3 py-1 bg-[#0f62fe] hover:bg-[#0043ce] text-white rounded-none text-xs font-normal flex items-center gap-1 tracking-carbon"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingSessionId(null)}
                          className="px-3 py-1 bg-[#f4f4f4] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#161616] rounded-none text-xs font-normal tracking-carbon"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[#525252]">{session.notes || 'None'}</span>
                        <button
                          onClick={() => handleStartEditNotes(session)}
                          className="text-[#0f62fe] hover:text-[#0043ce] hover:underline text-xs cursor-pointer font-normal tracking-carbon"
                        >
                          edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 4: Instruction Line */}
                  <div className="text-[11px] text-[#8c8c8c] tracking-carbon">
                    Click on a screenshot thumbnail to zoom in.
                  </div>

                  {/* Row 5: Screenshot Thumbnails Row / Grid */}
                  {session.screenshots && session.screenshots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-1">
                      {session.screenshots.map((sc: any) => {
                        const capTime = new Date(sc.capturedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        });
                        const actPct =
                          sc.activityPercentage !== null && sc.activityPercentage !== undefined
                            ? Math.round(sc.activityPercentage)
                            : 100;

                        return (
                          <div
                            key={sc.id}
                            onClick={() =>
                              setActiveScreenshot({
                                ...sc,
                                employeeName,
                                projectName,
                                taskTitle,
                              })
                            }
                            className="group cursor-pointer rounded-none border border-[#e0e0e0] hover:border-[#0f62fe] bg-white overflow-hidden transition-all space-y-2 p-2"
                          >
                            {/* Thumbnail Container */}
                            <div className="aspect-video relative rounded-none overflow-hidden bg-[#161616] border border-[#e0e0e0]">
                              <img
                                src={sc.fileUrl}
                                alt={`Capture at ${capTime}`}
                                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-[#161616]/0 group-hover:bg-[#161616]/30 transition-colors flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>

                            {/* Thumbnail Metadata */}
                            <div className="space-y-1 px-0.5">
                              <div className="text-[11px] text-[#161616]">
                                <span className="font-medium">Time:</span>{' '}
                                <span className="text-[#525252]">{capTime}</span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-[#161616]">
                                <span className="font-medium text-[#161616]">Activity:</span>
                                <div className="flex-1 h-2 bg-[#e0e0e0] rounded-none overflow-hidden flex min-w-[40px]">
                                  <div
                                    className="bg-[#24a148] h-full rounded-none transition-all"
                                    style={{ width: `${Math.min(100, Math.max(5, actPct))}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-[#525252] shrink-0">{actPct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-none bg-[#f4f4f4] border border-[#e0e0e0] text-xs text-[#8c8c8c] text-center tracking-carbon">
                      No screenshots captured during this session.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Lightbox Zoom Viewer */}
        {activeScreenshot && (
          <div className="fixed inset-0 bg-[#161616]/80 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-[#161616] rounded-none border border-[#262626] max-w-5xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 bg-[#161616] flex items-center justify-between text-white border-b border-[#262626]">
                <div>
                  <h3 className="font-medium text-sm text-white">
                    {activeScreenshot.employeeName} • Screenshot Zoom
                  </h3>
                  <p className="text-[11px] text-[#8c8c8c] mt-0.5 tracking-carbon">
                    Captured: {new Date(activeScreenshot.capturedAt).toLocaleString()}
                    {activeScreenshot.projectName && ` • Project: ${activeScreenshot.projectName}`}
                    {activeScreenshot.taskTitle && ` (${activeScreenshot.taskTitle})`}
                    {activeScreenshot.activityPercentage !== null &&
                      ` • Activity: ${Math.round(activeScreenshot.activityPercentage)}%`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hasPermission('screenshots.delete') && organization?.allowScreenshotDelete && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this screenshot?')) {
                          deleteScreenshotMutation.mutate(activeScreenshot.id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-none bg-[#da1e28] text-white hover:bg-[#ba1b23] text-xs font-normal transition-colors flex items-center gap-1.5 tracking-carbon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveScreenshot(null)}
                    className="p-1.5 text-[#8c8c8c] hover:text-white hover:bg-[#262626] rounded-none transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Image View */}
              <div className="flex-1 overflow-auto bg-[#161616] flex items-center justify-center p-4">
                <img
                  src={activeScreenshot.fileUrl}
                  alt="High Resolution Screenshot Capture"
                  className="max-h-[75vh] w-auto object-contain rounded-none border border-[#262626]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function TimelinesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#525252] text-xs tracking-carbon">Loading timelines...</div>}>
      <TimelinesPageContent />
    </Suspense>
  );
}
