'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import {
  FolderGit2,
  Plus,
  Search,
  Users,
  CheckSquare,
  Clock,
  Briefcase,
  ChevronRight,
  MoreVertical,
  X,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state for creating project
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formBudgetHours, setFormBudgetHours] = useState('');
  const [formColor, setFormColor] = useState('#0f62fe');
  const [formBillable, setFormBillable] = useState(true);
  const [formError, setFormError] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.createProject(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create project');
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormClientName('');
    setFormBudgetHours('');
    setFormColor('#0f62fe');
    setFormBillable(true);
    setFormError('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formName.trim()) {
      setFormError('Project name is required');
      return;
    }

    createMutation.mutate({
      name: formName.trim(),
      code: formCode.trim() || undefined,
      description: formDescription.trim() || undefined,
      clientName: formClientName.trim() || undefined,
      budgetHours: formBudgetHours ? parseFloat(formBudgetHours) : undefined,
      color: formColor,
      billable: formBillable,
    });
  };

  const projectList = Array.isArray(projects) ? projects : [];

  const filteredProjects = projectList.filter((p: any) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchCode = p.code?.toLowerCase().includes(q);
      const matchClient = p.clientName?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchClient) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Projects Directory</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              Organize workflows, track client budgets, and monitor logged hours across project tasks
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('projects.create') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal tracking-carbon rounded-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#e0e0e0] rounded-none p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-[#8c8c8c]" />
            <input
              type="text"
              placeholder="Search projects by name, code or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent focus:outline-none w-full text-[#161616] text-xs tracking-carbon"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="bg-white border border-[#e0e0e0] rounded-none p-16 text-center text-xs text-[#8c8c8c] tracking-carbon">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-[#e0e0e0] rounded-none p-16 text-center text-[#525252] text-xs space-y-2">
            <FolderGit2 className="w-8 h-8 text-[#8c8c8c] mx-auto" />
            <p className="font-medium text-[#161616]">No projects found</p>
            <p className="text-[#525252] tracking-carbon">Try adjusting your search criteria or create a new project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p: any) => {
              const statusTag =
                p.status === 'ACTIVE'
                  ? 'bg-[#defbe6] text-[#0e6027] border-[#a7f0ba]'
                  : p.status === 'COMPLETED'
                  ? 'bg-[#edf5ff] text-[#0043ce] border-[#a6c8ff]'
                  : p.status === 'ON_HOLD'
                  ? 'bg-[#fdf2cc] text-[#6d4f00] border-[#fbe499]'
                  : 'bg-[#f4f4f4] text-[#525252] border-[#e0e0e0]';

              const memberCount = p._count?.members || p.members?.length || 0;
              const taskCount = p._count?.tasks || p.tasks?.length || 0;

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="bg-white border border-[#e0e0e0] rounded-none p-5 hover:border-[#0f62fe] transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-none shrink-0"
                          style={{ backgroundColor: p.color || '#0f62fe' }}
                        />
                        <div>
                          <h3 className="font-medium text-sm text-[#161616] group-hover:text-[#0f62fe] transition-colors">
                            {p.name}
                          </h3>
                          {p.code && <span className="text-[10px] font-mono text-[#8c8c8c]">{p.code}</span>}
                        </div>
                      </div>

                      <span className={`text-[10px] font-normal px-2 py-0.5 rounded-none border ${statusTag}`}>
                        {p.status}
                      </span>
                    </div>

                    {p.description && (
                      <p className="text-xs text-[#525252] line-clamp-2 leading-relaxed tracking-carbon">
                        {p.description}
                      </p>
                    )}

                    {p.clientName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#525252]">
                        <Briefcase className="w-3.5 h-3.5 text-[#8c8c8c]" />
                        <span>Client: {p.clientName}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats Bar */}
                  <div className="mt-5 pt-4 border-t border-[#e0e0e0] grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-[#8c8c8c] flex items-center gap-1 tracking-carbon">
                        <Users className="w-3 h-3" /> Members
                      </span>
                      <span className="text-xs font-medium text-[#161616] mt-0.5">{memberCount}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-[#8c8c8c] flex items-center gap-1 tracking-carbon">
                        <CheckSquare className="w-3 h-3" /> Tasks
                      </span>
                      <span className="text-xs font-medium text-[#161616] mt-0.5">{taskCount}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-[#8c8c8c] flex items-center gap-1 tracking-carbon">
                        <Clock className="w-3 h-3" /> Budget
                      </span>
                      <span className="text-xs font-medium text-[#161616] mt-0.5">
                        {p.budgetHours ? `${p.budgetHours}h` : 'No cap'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Create Project Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-none border border-[#e0e0e0] max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-medium text-sm text-[#161616]">Create New Project</h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="p-1 text-[#8c8c8c] hover:text-[#161616]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-2.5 rounded-none bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core Web Platform"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Project Code</label>
                    <input
                      type="text"
                      placeholder="e.g. PROJ-WEB"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Client Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief objective or scope of this project..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] resize-none tracking-carbon"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Budget Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 120"
                      value={formBudgetHours}
                      onChange={(e) => setFormBudgetHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Badge Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="w-8 h-7 rounded-none border border-[#e0e0e0] cursor-pointer p-0.5 bg-[#f4f4f4]"
                      />
                      <span className="text-xs font-mono text-[#525252]">{formColor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={formBillable}
                    onChange={(e) => setFormBillable(e.target.checked)}
                    className="rounded-none border-[#e0e0e0] text-[#0f62fe] focus:ring-0"
                  />
                  <label htmlFor="billable" className="text-xs text-[#161616] font-normal tracking-carbon">
                    Billable Project (Track client billing rates)
                  </label>
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-xs font-normal rounded-none border border-[#e0e0e0] text-[#525252] hover:bg-[#f4f4f4] transition-colors tracking-carbon"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 text-xs font-normal rounded-none bg-[#0f62fe] text-white hover:bg-[#0043ce] disabled:opacity-50 transition-colors tracking-carbon"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Project'}
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
