'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  User,
  FolderGit2,
  Calendar,
  Clock,
  AlertCircle,
  X,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create task form state
  const [formProjectId, setFormProjectId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formError, setFormError] = useState('');

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', { projectId, assigneeId, status: statusFilter, priority: priorityFilter }],
    queryFn: () =>
      api.getTasks({
        projectId: projectId || undefined,
        assigneeId: assigneeId || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => api.getProjects(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (body: any) => api.createTask(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => setFormError(err.message || 'Failed to create task'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const resetForm = () => {
    setFormProjectId('');
    setFormTitle('');
    setFormDescription('');
    setFormPriority('MEDIUM');
    setFormAssigneeId('');
    setFormEstimatedHours('');
    setFormDueDate('');
    setFormError('');
  };

  const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.data || [];

  const filteredTasks = tasks.filter((t: any) => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchProject = t.project?.name?.toLowerCase().includes(q);
      const matchAssignee = t.assignee?.displayName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchProject && !matchAssignee) return false;
    }
    return true;
  });

  // Calculate task counts
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter((t: any) => t.status === 'DONE').length;
  const todoCount = tasks.filter((t: any) => t.status === 'TODO').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Task Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign work items, manage priorities, and track estimates across all client projects
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('tasks.create') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Tasks</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalTasks}</p>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">To Do</p>
            <p className="text-xl font-bold text-slate-700 mt-0.5">{todoCount}</p>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">In Progress</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5">{inProgressCount}</p>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Completed</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{doneCount}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks, descriptions, or assignees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-slate-700 text-xs"
              />
            </div>

            {/* Select Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
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

              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
                >
                  <option value="">All Assignees</option>
                  {employees?.data?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="focus:outline-none text-slate-700 bg-transparent text-xs font-medium"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Task Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs space-y-2">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No tasks found</p>
              <p className="text-slate-400">Try changing the search or filter settings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Task Details</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Estimate</th>
                    <th className="py-3 px-4 text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((t: any) => {
                    const priorityColor =
                      t.priority === 'URGENT'
                        ? 'text-red-700 bg-red-50 border-red-200'
                        : t.priority === 'HIGH'
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : t.priority === 'MEDIUM'
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-slate-600 bg-slate-100 border-slate-200';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                          <div>{t.title}</div>
                          {t.description && (
                            <p className="text-[11px] text-slate-400 font-normal truncate max-w-sm mt-0.5">
                              {t.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {t.project ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: t.project.color || '#3B82F6' }}
                              />
                              <span className="font-medium text-slate-700 truncate max-w-[140px]">
                                {t.project.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {t.assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                {t.assignee.firstName?.[0]}{t.assignee.lastName?.[0]}
                              </div>
                              <span className="text-slate-700 font-medium">{t.assignee.displayName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColor}`}>
                            {t.priority}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={t.status}
                            onChange={(e) =>
                              updateStatusMutation.mutate({ taskId: t.id, status: e.target.value })
                            }
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="DONE">Done</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono font-medium">
                          {t.estimatedHours ? `${t.estimatedHours}h` : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-500 text-[11px]">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Task Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-slate-900">Create New Task</h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formProjectId) {
                    setFormError('Please select a project');
                    return;
                  }
                  if (!formTitle.trim()) {
                    setFormError('Task title is required');
                    return;
                  }
                  createTaskMutation.mutate({
                    projectId: formProjectId,
                    title: formTitle.trim(),
                    description: formDescription.trim() || undefined,
                    priority: formPriority,
                    assigneeId: formAssigneeId || undefined,
                    estimatedHours: formEstimatedHours ? parseFloat(formEstimatedHours) : undefined,
                    dueDate: formDueDate ? new Date(formDueDate).toISOString() : undefined,
                  });
                }}
                className="p-5 space-y-3.5"
              >
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project *</label>
                  <select
                    required
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Project...</option>
                    {projects?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Design responsive customer checkout flow"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Assignee</label>
                    <select
                      value={formAssigneeId}
                      onChange={(e) => setFormAssigneeId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {employees?.data?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Priority</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 4.0"
                      value={formEstimatedHours}
                      onChange={(e) => setFormEstimatedHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Due Date</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Task details and scope..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetForm();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
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
