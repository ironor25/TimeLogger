'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  Camera,
  Search,
  Filter,
  Calendar,
  User,
  FolderGit2,
  Trash2,
  Maximize2,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function UserScreenshotsPage() {
  const queryClient = useQueryClient();
  const { hasPermission, organization } = useAuth();

  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeScreenshot, setActiveScreenshot] = useState<any | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => api.getProjects(),
  });

  const { data: screenshotsData, isLoading } = useQuery({
    queryKey: ['screenshots', { employeeId, projectId, date: selectedDate }],
    queryFn: () => api.getScreenshots({ employeeId, projectId, date: selectedDate, limit: 36 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScreenshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenshots'] });
      setActiveScreenshot(null);
    },
  });

  const screenshots: any[] = Array.isArray(screenshotsData) ? screenshotsData : (screenshotsData?.data || []);
  const employeeList: any[] = Array.isArray(employees) ? employees : (employees?.data || []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Screenshots Gallery</h1>
            <p className="text-xs text-slate-500 mt-0.5">Automated visual monitoring and productivity audits</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
              >
                <option value="">All Employees</option>
                {employeeList.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
              >
                <option value="">All Projects</option>
                {projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="focus:outline-none text-slate-700 text-xs bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Captured Records ({screenshots.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Interval: {organization?.screenshotIntervalMinutes || 5} mins
            </span>
          </div>

          {isLoading ? (
            <div className="py-24 text-center text-xs text-slate-400">Loading screen captures...</div>
          ) : screenshots.length === 0 ? (
            <div className="py-24 text-center text-xs text-slate-400">
              No screenshots found for the selected date and filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((sc: any) => (
                <div
                  key={sc.id}
                  onClick={() => setActiveScreenshot(sc)}
                  className="group rounded-lg border border-slate-200 overflow-hidden bg-slate-900 cursor-pointer hover:border-blue-500 transition-all hover:shadow-md"
                >
                  <div className="aspect-video relative overflow-hidden bg-slate-950">
                    <img
                      src={sc.fileUrl}
                      alt="Screen Capture"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="p-3 bg-white text-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 truncate max-w-[130px]">
                        {sc.employee?.displayName || 'Employee'}
                      </span>
                      {sc.activityPercentage !== null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {sc.activityPercentage}% Act
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(sc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="truncate max-w-[100px] text-slate-400">{sc.project?.name || 'General'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Lightbox Viewer */}
        {activeScreenshot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
              {/* Modal Topbar */}
              <div className="p-4 bg-slate-950 flex items-center justify-between text-white border-b border-slate-800">
                <div>
                  <h3 className="font-semibold text-sm">{activeScreenshot.employee?.displayName}</h3>
                  <p className="text-[11px] text-slate-400">
                    Captured at: {new Date(activeScreenshot.capturedAt).toLocaleString()}
                    {activeScreenshot.project && ` • Project: ${activeScreenshot.project.name}`}
                    {activeScreenshot.task && ` (${activeScreenshot.task.title})`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hasPermission('screenshots.delete') && organization?.allowScreenshotDelete && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this screenshot?')) {
                          deleteMutation.mutate(activeScreenshot.id);
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
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Full Image */}
              <div className="p-4 bg-black flex items-center justify-center max-h-[75vh] overflow-auto">
                <img
                  src={activeScreenshot.fileUrl}
                  alt="Full Screenshot"
                  className="max-h-[70vh] w-auto object-contain rounded border border-slate-800"
                />
              </div>

              {/* Footer details */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Resolution: {activeScreenshot.width || 1920}x{activeScreenshot.height || 1080} • {Math.round(activeScreenshot.fileSize / 1024)} KB</span>
                <span className="font-semibold text-emerald-400">Activity Level: {activeScreenshot.activityPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
