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
  const { hasPermission, organization, role, employee } = useAuth();
  const isEmployeeRole = role === 'EMPLOYEE';

  const [employeeId, setEmployeeId] = useState(isEmployeeRole ? (employee?.id || '') : '');
  const [projectId, setProjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeScreenshot, setActiveScreenshot] = useState<any | null>(null);

  const effectiveEmpId = isEmployeeRole ? (employee?.id || '') : employeeId;

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
    enabled: !isEmployeeRole,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => api.getProjects(),
  });

  const { data: screenshotsData, isLoading } = useQuery({
    queryKey: ['screenshots', { employeeId: effectiveEmpId, projectId, date: selectedDate }],
    queryFn: () => api.getScreenshots({ employeeId: effectiveEmpId || undefined, projectId, date: selectedDate, limit: 36 }),
    enabled: !isEmployeeRole || !!employee?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScreenshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenshots'] });
      setActiveScreenshot(null);
    },
  });

  const rawScreenshots: any[] = Array.isArray(screenshotsData) ? screenshotsData : (screenshotsData?.data || []);
  const screenshots: any[] = isEmployeeRole && employee?.id
    ? rawScreenshots.filter((s: any) => s.employeeId === employee.id || s.employee?.id === employee.id)
    : rawScreenshots;
  const employeeList: any[] = Array.isArray(employees) ? employees : (employees?.data || []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">
              {isEmployeeRole ? 'My Screenshots Gallery' : 'User Screenshots Gallery'}
            </h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              {isEmployeeRole ? 'Your personal captured screenshots history' : 'Automated visual monitoring and productivity audits'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEmployeeRole ? (
              <div className="flex items-center gap-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-[#525252]" />
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
                >
                  <option value="">All Employees</option>
                  {employeeList.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs text-[#161616]">
                <User className="w-3.5 h-3.5 text-[#0f62fe]" />
                <span className="font-medium tracking-carbon">{employee?.displayName || 'My Screenshots'}</span>
              </div>
            )}


            <div className="flex items-center gap-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
              <FolderGit2 className="w-3.5 h-3.5 text-[#525252]" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
              >
                <option value="">All Projects</option>
                {projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#525252]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="focus:outline-none text-[#161616] text-xs bg-transparent cursor-pointer font-medium tracking-carbon"
              />
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="bg-white border border-[#e0e0e0] rounded-none p-5">
          <div className="flex items-center justify-between mb-4 border-b border-[#e0e0e0] pb-3">
            <h2 className="text-xs font-normal text-[#525252] uppercase tracking-wider">
              Captured Records ({screenshots.length})
            </h2>
            <span className="text-[11px] text-[#8c8c8c] tracking-carbon">
              Interval: {organization?.screenshotIntervalMinutes || 5} mins
            </span>
          </div>

          {isLoading ? (
            <div className="py-24 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading screen captures...</div>
          ) : screenshots.length === 0 ? (
            <div className="py-24 text-center text-xs text-[#525252] tracking-carbon">
              No screenshots found for the selected date and filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((sc: any) => (
                <div
                  key={sc.id}
                  onClick={() => setActiveScreenshot(sc)}
                  className="group rounded-none border border-[#e0e0e0] overflow-hidden bg-[#161616] cursor-pointer hover:border-[#0f62fe] transition-all"
                >
                  <div className="aspect-video relative overflow-hidden bg-[#161616]">
                    <img
                      src={sc.fileUrl}
                      alt="Screen Capture"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-[#161616]/0 group-hover:bg-[#161616]/30 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="p-3 bg-white text-[#161616] space-y-1.5 border-t border-[#e0e0e0]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-[#161616] truncate max-w-[130px]">
                        {sc.employee?.displayName || 'Employee'}
                      </span>
                      <span className="text-[11px] text-[#525252]">
                        {new Date(sc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Activity Percentage Bar */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#525252] pt-0.5">
                      <span className="font-medium text-[#161616] shrink-0">Activity:</span>
                      <div className="flex-1 h-2 bg-[#e0e0e0] rounded-none overflow-hidden flex min-w-[40px]">
                        <div
                          className={`h-full rounded-none transition-all ${
                            (sc.activityPercentage ?? 0) >= 50
                              ? 'bg-[#24a148]'
                              : (sc.activityPercentage ?? 0) >= 20
                              ? 'bg-[#f1c21b]'
                              : 'bg-[#da1e28]'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, Math.round(sc.activityPercentage ?? 0)))}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-[#525252] shrink-0">
                        {sc.activityPercentage !== null && sc.activityPercentage !== undefined
                          ? `${Math.round(sc.activityPercentage)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Lightbox Viewer */}
        {activeScreenshot && (
          <div className="fixed inset-0 bg-[#161616]/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#161616] rounded-none border border-[#262626] max-w-4xl w-full overflow-hidden flex flex-col">
              {/* Modal Topbar */}
              <div className="p-4 bg-[#161616] flex items-center justify-between text-white border-b border-[#262626]">
                <div>
                  <h3 className="font-medium text-sm text-white">{activeScreenshot.employee?.displayName}</h3>
                  <p className="text-[11px] text-[#8c8c8c] tracking-carbon">
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
                      className="px-3 py-1.5 rounded-none bg-[#da1e28] text-white hover:bg-[#ba1b23] text-xs font-normal transition-colors flex items-center gap-1.5 tracking-carbon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveScreenshot(null)}
                    className="p-1.5 rounded-none text-[#8c8c8c] hover:text-white hover:bg-[#262626]"
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
                  className="max-h-[70vh] w-auto object-contain rounded-none border border-[#262626]"
                />
              </div>

              {/* Footer details */}
              <div className="p-3 bg-[#161616] border-t border-[#262626] text-[11px] text-[#8c8c8c] flex items-center justify-between tracking-carbon">
                <span>Resolution: {activeScreenshot.width || 1920}x{activeScreenshot.height || 1080} • {Math.round(activeScreenshot.fileSize / 1024)} KB</span>
                <span className="font-medium text-[#24a148]">Activity Level: {activeScreenshot.activityPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
