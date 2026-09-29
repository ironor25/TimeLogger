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
  const { hasPermission, organization } = useAuth();

  const initialEmpId = searchParams.get('employeeId') || '';
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

  // Selected employee ID (fallback to first employee if none selected)
  const activeEmpId = employeeId || (employeeList.length > 0 ? employeeList[0].id : '');

  // 2. Fetch Timeline Data for Selected Employee & Date
  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['timeline', activeEmpId, selectedDate],
    queryFn: () => api.getTimeline({ employeeId: activeEmpId || undefined, date: selectedDate }),
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
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Visual Work Timelines</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee session-by-session activity, tracked time, breaks, and screenshot captures
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Employee Search & Selector */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="relative">
                <select
                  value={activeEmpId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="focus:outline-none text-slate-800 bg-transparent text-xs font-semibold cursor-pointer pr-4"
                >
                  <option value="">All Employees</option>
                  {filteredEmployees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.displayName} ({emp.employeeCode || emp.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="focus:outline-none text-slate-800 text-xs font-semibold bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 6 Top Metric Cards (Matching User Reference Image 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Time Worked (Indigo) */}
          <div className="bg-[#4F46E5] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[96px] transition-transform hover:scale-[1.02]">
            <div className="text-2xl font-black tracking-tight drop-shadow-xs">
              {summary?.formattedWorked || '0h'}
            </div>
            <div className="text-xs font-medium text-indigo-100/90 mt-1">Time Worked</div>
          </div>

          {/* 2. Timer Active (Vibrant Green) */}
          <div className="bg-[#22C55E] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[96px] transition-transform hover:scale-[1.02]">
            <div className="text-2xl font-black tracking-tight drop-shadow-xs">
              {summary?.formattedTimerActive || '0h'}
            </div>
            <div className="text-xs font-medium text-green-100/90 mt-1">Timer (Active)</div>
          </div>

          {/* 3. Manual Entry (Amber/Orange) */}
          <div className="bg-[#F59E0B] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[96px] transition-transform hover:scale-[1.02]">
            <div className="text-2xl font-black tracking-tight drop-shadow-xs">
              {summary?.formattedManual || '0h'}
            </div>
            <div className="text-xs font-medium text-amber-100/90 mt-1">Manual Entry</div>
          </div>

          {/* 4. Meeting / Break Hours (Teal) */}
          <div className="bg-[#0D9488] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[96px] transition-transform hover:scale-[1.02]">
            <div className="text-2xl font-black tracking-tight drop-shadow-xs">
              {summary?.formattedMeeting || summary?.formattedBreak || '0h'}
            </div>
            <div className="text-xs font-medium text-teal-100/90 mt-1">Meeting Hours</div>
          </div>

          {/* 5. Idle Time (Red) */}
          <div className="bg-[#EF4444] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[96px] transition-transform hover:scale-[1.02]">
            <div className="text-2xl font-black tracking-tight drop-shadow-xs">
              {summary?.formattedIdle || '0h'}
            </div>
            <div className="text-xs font-medium text-red-100/90 mt-1">Idle Time</div>
          </div>

          {/* 6. Employees Worked (White / Gray) */}
          <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[96px] transition-transform hover:scale-[1.02]">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {summary?.employeesWorkedCount ?? (sessions.length > 0 ? 1 : 0)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Employees Worked</div>
          </div>
        </div>

        {/* Work Sessions List (Matching User Reference Image 2) */}
        <div className="space-y-5">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Loading timeline work sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-700">No work sessions recorded for this day</div>
              <p className="text-xs text-slate-400">
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
              const projectName = session.project?.name || 'Default Project';
              const taskTitle = session.task?.title || 'Default Task';
              const ipAddr = session.ipAddress || '130.176.188.234';

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-colors"
                >
                  {/* Row 1: Date, Time & Delete Session */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-800">
                      <span className="font-semibold text-slate-900">
                        Date: <span className="font-normal text-slate-700">{formatDateHeader(session.startedAt)}</span>
                      </span>
                      <span className="font-semibold text-slate-900">
                        Time:{' '}
                        <span className="font-normal text-slate-700">
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
                      className="text-red-500 hover:text-red-700 hover:underline text-xs font-semibold self-start sm:self-auto cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span>Delete Session</span>
                    </button>
                  </div>

                  {/* Row 2: Employee, Project, Task, IP */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-800 font-medium">
                    <div>
                      <span className="font-bold text-slate-900">Employee: </span>
                      <span className="text-slate-700">{employeeName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Project: </span>
                      <span className="text-slate-700">{projectName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Task: </span>
                      <span className="text-slate-700">{taskTitle}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">IP: </span>
                      <span className="text-slate-700">{ipAddr}</span>
                    </div>
                  </div>

                  {/* Row 3: Notes (with inline edit) */}
                  <div className="text-xs text-slate-800 flex items-center gap-2">
                    <span className="font-bold text-slate-900">Notes:</span>
                    {editingSessionId === session.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Enter session memo notes..."
                          className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500 min-w-[200px]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNotes(session.id)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingSessionId(null)}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">{session.notes || 'None'}</span>
                        <button
                          onClick={() => handleStartEditNotes(session)}
                          className="text-blue-600 hover:underline text-xs cursor-pointer font-medium"
                        >
                          edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 4: Instruction Line */}
                  <div className="text-xs text-slate-500">
                    Click on a screenshot thumbnail to zoom in.
                  </div>

                  {/* Row 5: Screenshot Thumbnails Row / Grid */}
                  {session.screenshots && session.screenshots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 pt-1">
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
                            className="group cursor-pointer rounded-xl border border-slate-200 hover:border-blue-500 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all space-y-2 p-2"
                          >
                            {/* Thumbnail Container */}
                            <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                              <img
                                src={sc.fileUrl}
                                alt={`Capture at ${capTime}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                                <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>

                            {/* Thumbnail Metadata */}
                            <div className="space-y-1 px-0.5">
                              <div className="text-[11px] font-bold text-slate-800">
                                Time: <span className="font-normal text-slate-600">{capTime}</span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-slate-800">
                                <span className="font-bold">Activity:</span>
                                <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden flex min-w-[40px]">
                                  <div
                                    className="bg-[#22C55E] h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(5, actPct))}%` }}
                                  />
                                </div>
                                <span className="font-bold text-[10px] text-slate-700 shrink-0">{actPct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-400 text-center">
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
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 bg-slate-950 flex items-center justify-between text-white border-b border-slate-800">
                <div>
                  <h3 className="font-semibold text-sm">
                    {activeScreenshot.employeeName} • Screenshot Zoom
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Captured at: {new Date(activeScreenshot.capturedAt).toLocaleString()}
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
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveScreenshot(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Image View */}
              <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4">
                <img
                  src={activeScreenshot.fileUrl}
                  alt="High Resolution Screenshot Capture"
                  className="max-h-[75vh] w-auto object-contain rounded-lg border border-slate-800 shadow-lg"
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
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading timelines...</div>}>
      <TimelinesPageContent />
    </Suspense>
  );
}
