'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { FolderGit2, Calendar, Maximize2, X } from 'lucide-react';

export default function ProjectScreenshotsPage() {
  const [projectId, setProjectId] = useState('');
  const [activeScreenshot, setActiveScreenshot] = useState<any | null>(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => api.getProjects(),
  });

  const projectList: any[] = Array.isArray(projects) ? projects : (projects?.data || []);
  const activeProjId = projectId || (projectList?.[0]?.id || '');

  const { data: screenshotsData, isLoading } = useQuery({
    queryKey: ['project-screenshots', activeProjId],
    queryFn: () => api.getScreenshots({ projectId: activeProjId, limit: 30 }),
    enabled: !!activeProjId,
  });

  const screenshots: any[] = Array.isArray(screenshotsData) ? screenshotsData : (screenshotsData?.data || []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Project Screenshots</h1>
            <p className="text-xs text-slate-500 mt-0.5">Filter visual telemetry by specific client project or milestone</p>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeProjId}
              onChange={(e) => setProjectId(e.target.value)}
              className="focus:outline-none text-slate-700 bg-transparent text-xs font-semibold"
            >
              {projects?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5">
          {isLoading ? (
            <div className="py-24 text-center text-xs text-slate-400">Loading project captures...</div>
          ) : screenshots.length === 0 ? (
            <div className="py-24 text-center text-xs text-slate-400">
              No screenshots found for this project yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((sc: any) => (
                <div
                  key={sc.id}
                  onClick={() => setActiveScreenshot(sc)}
                  className="group rounded-lg border border-slate-200 overflow-hidden bg-slate-900 cursor-pointer hover:border-blue-500 transition-all"
                >
                  <div className="aspect-video relative overflow-hidden bg-slate-950">
                    <img
                      src={sc.fileUrl}
                      alt="Project Screenshot"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3 bg-white text-slate-800">
                    <div className="font-semibold text-xs truncate">{sc.employee?.displayName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(sc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {sc.task && ` • ${sc.task.title}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeScreenshot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 bg-slate-950 flex items-center justify-between text-white border-b border-slate-800">
                <span className="font-semibold text-sm">{activeScreenshot.employee?.displayName}</span>
                <button onClick={() => setActiveScreenshot(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-black flex items-center justify-center max-h-[75vh]">
                <img src={activeScreenshot.fileUrl} alt="Project screen" className="max-h-[70vh] object-contain rounded" />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
