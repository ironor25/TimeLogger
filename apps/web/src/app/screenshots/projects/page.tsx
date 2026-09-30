'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { FolderGit2, Calendar, Maximize2, X, Activity } from 'lucide-react';

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Project Screenshots</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">Filter visual telemetry by specific client project or milestone</p>
          </div>

          <div className="flex items-center gap-2 bg-[#f4f4f4] border border-[#e0e0e0] px-3 py-1.5 text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-[#525252]" />
            <select
              value={activeProjId}
              onChange={(e) => setProjectId(e.target.value)}
              className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
            >
              {projectList.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white border border-[#e0e0e0] p-5">
          {isLoading ? (
            <div className="py-24 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading project captures...</div>
          ) : screenshots.length === 0 ? (
            <div className="py-24 text-center text-xs text-[#8c8c8c] tracking-carbon">
              No screenshots found for this project yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((sc: any) => (
                <div
                  key={sc.id}
                  onClick={() => setActiveScreenshot(sc)}
                  className="group border border-[#e0e0e0] overflow-hidden bg-white cursor-pointer hover:border-[#0f62fe] transition-colors"
                >
                  <div className="aspect-video relative overflow-hidden bg-[#161616]">
                    <img
                      src={sc.fileUrl}
                      alt="Project Screenshot"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-[#0f62fe]/0 group-hover:bg-[#0f62fe]/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-[#161616]/90 text-white text-[11px] px-2 py-1 tracking-carbon flex items-center gap-1">
                        <Maximize2 className="w-3 h-3" /> Expand
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white border-t border-[#e0e0e0] text-[#161616]">
                    <div className="font-normal text-xs text-[#161616] truncate tracking-carbon">{sc.employee?.displayName || 'Member'}</div>
                    <div className="text-[11px] text-[#525252] mt-0.5 tracking-carbon flex items-center justify-between">
                      <span>{new Date(sc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {sc.activityScore !== undefined && (
                        <span className="font-mono text-[10px] text-[#0f62fe] font-medium">{sc.activityScore}% act</span>
                      )}
                    </div>
                    {sc.task && (
                      <div className="text-[10px] text-[#8c8c8c] truncate mt-1 tracking-carbon">
                        Task: {sc.task.title}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeScreenshot && (
          <div className="fixed inset-0 bg-[#161616]/80 backdrop-blur-none flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-[#161616] border border-[#262626] max-w-4xl w-full overflow-hidden flex flex-col">
              <div className="p-4 bg-[#262626] flex items-center justify-between text-white border-b border-[#393939]">
                <div className="flex items-center gap-2">
                  <span className="font-normal text-xs tracking-carbon">{activeScreenshot.employee?.displayName}</span>
                  <span className="text-[11px] text-[#8c8c8c] font-mono">
                    {new Date(activeScreenshot.capturedAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setActiveScreenshot(null)}
                  className="text-[#c6c6c6] hover:text-white p-1 hover:bg-[#393939] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-[#161616] flex items-center justify-center max-h-[75vh]">
                <img src={activeScreenshot.fileUrl} alt="Project screen" className="max-h-[70vh] object-contain" />
              </div>
              {activeScreenshot.task && (
                <div className="p-3 bg-[#262626] text-xs text-[#c6c6c6] border-t border-[#393939] tracking-carbon">
                  Task: <span className="text-white">{activeScreenshot.task.title}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
