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
  DollarSign,
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
  const [formColor, setFormColor] = useState('#3B82F6');
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
    setFormColor('#3B82F6');
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Projects Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize workflows, track client budgets, and monitor logged hours across project tasks
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('projects.create') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects by name, code or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent focus:outline-none w-full text-slate-700 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
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
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-xs text-slate-400">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-500 text-xs space-y-2">
            <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No projects found</p>
            <p className="text-slate-400">Try adjusting your search criteria or create a new project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p: any) => {
              const statusColor =
                p.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : p.status === 'COMPLETED'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : p.status === 'ON_HOLD'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200';

              const memberCount = p._count?.members || p.members?.length || 0;
              const taskCount = p._count?.tasks || p.tasks?.length || 0;

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color || '#3B82F6' }}
                        />
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {p.name}
                          </h3>
                          {p.code && <span className="text-[10px] font-mono text-slate-400">{p.code}</span>}
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {p.status}
                      </span>
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {p.clientName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>Client: {p.clientName}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats Bar */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Members
                      </span>
                      <span className="text-xs font-bold text-slate-700 mt-0.5">{memberCount}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" /> Tasks
                      </span>
                      <span className="text-xs font-bold text-slate-700 mt-0.5">{taskCount}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Budget
                      </span>
                      <span className="text-xs font-bold text-slate-700 mt-0.5">
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-slate-900">Create New Project</h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core Web Platform"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Project Code</label>
                    <input
                      type="text"
                      placeholder="e.g. PROJ-WEB"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Client Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief objective or scope of this project..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Budget Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 120"
                      value={formBudgetHours}
                      onChange={(e) => setFormBudgetHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Badge Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="w-8 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <span className="text-xs font-mono text-slate-600">{formColor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={formBillable}
                    onChange={(e) => setFormBillable(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="billable" className="text-xs text-slate-700 font-medium">
                    Billable Project (Track client billing rates)
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetForm();
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
