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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Task Management</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
              Assign work items, manage priorities, and track estimates across all client projects
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('tasks.create') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal tracking-carbon rounded-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none">
            <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">Total Tasks</p>
            <p className="text-2xl font-light text-[#161616] mt-1">{totalTasks}</p>
          </div>
          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none">
            <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">To Do</p>
            <p className="text-2xl font-light text-[#161616] mt-1">{todoCount}</p>
          </div>
          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none">
            <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-light text-[#0f62fe] mt-1">{inProgressCount}</p>
          </div>
          <div className="p-4 bg-white border border-[#e0e0e0] rounded-none">
            <p className="text-[11px] font-normal text-[#525252] uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-light text-[#24a148] mt-1">{doneCount}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white border border-[#e0e0e0] rounded-none p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 max-w-md bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-[#8c8c8c]" />
              <input
                type="text"
                placeholder="Search tasks, descriptions, or assignees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-[#161616] text-xs tracking-carbon"
              />
            </div>

            {/* Select Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
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

              <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
                >
                  <option value="">All Assignees</option>
                  {employees?.data?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>

              <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-1.5 text-xs">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="focus:outline-none text-[#161616] bg-transparent text-xs font-normal tracking-carbon cursor-pointer"
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
        <div className="bg-white border border-[#e0e0e0] rounded-none overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-16 text-center text-[#525252] text-xs space-y-2">
              <CheckSquare className="w-8 h-8 text-[#8c8c8c] mx-auto" />
              <p className="font-medium text-[#161616]">No tasks found</p>
              <p className="text-[#525252] tracking-carbon">Try changing the search or filter settings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f4f4] text-[#525252] text-[11px] font-normal uppercase tracking-wider border-b border-[#e0e0e0]">
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
                <tbody className="divide-y divide-[#e0e0e0] text-[#161616]">
                  {filteredTasks.map((t: any) => {
                    const priorityTag =
                      t.priority === 'URGENT'
                        ? 'text-[#da1e28] bg-[#ffebee] border-[#ffb3ba]'
                        : t.priority === 'HIGH'
                        ? 'text-[#6d4f00] bg-[#fdf2cc] border-[#fbe499]'
                        : t.priority === 'MEDIUM'
                        ? 'text-[#0043ce] bg-[#edf5ff] border-[#a6c8ff]'
                        : 'text-[#525252] bg-[#f4f4f4] border-[#e0e0e0]';

                    return (
                      <tr key={t.id} className="hover:bg-[#f4f4f4] transition-colors">
                        <td className="py-3.5 px-4 font-normal text-[#161616] max-w-xs">
                          <div className="font-medium text-[#161616]">{t.title}</div>
                          {t.description && (
                            <p className="text-[11px] text-[#8c8c8c] font-normal truncate max-w-sm mt-0.5 tracking-carbon">
                              {t.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {t.project ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-none shrink-0"
                                style={{ backgroundColor: t.project.color || '#0f62fe' }}
                              />
                              <span className="font-normal text-[#161616] truncate max-w-[140px]">
                                {t.project.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#8c8c8c]">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {t.assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-[#edf5ff] text-[#0f62fe] border border-[#a6c8ff] font-medium text-[10px] flex items-center justify-center rounded-none">
                                {t.assignee.firstName?.[0]}{t.assignee.lastName?.[0]}
                              </div>
                              <span className="text-[#161616] font-normal">{t.assignee.displayName}</span>
                            </div>
                          ) : (
                            <span className="text-[#8c8c8c] italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-normal px-2 py-0.5 rounded-none border ${priorityTag}`}>
                            {t.priority}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={t.status}
                            onChange={(e) =>
                              updateStatusMutation.mutate({ taskId: t.id, status: e.target.value })
                            }
                            className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-2.5 py-1 text-xs font-normal text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="DONE">Done</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-[#525252] font-mono">
                          {t.estimatedHours ? `${t.estimatedHours}h` : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right text-[#525252] text-[11px]">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '-'}
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
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-none border border-[#e0e0e0] max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-medium text-sm text-[#161616]">Create New Task</h3>
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
                  <div className="p-2.5 rounded-none bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Project *</label>
                  <select
                    required
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
                  >
                    <option value="">Select Project...</option>
                    {projects?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Design responsive customer checkout flow"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Assignee</label>
                    <select
                      value={formAssigneeId}
                      onChange={(e) => setFormAssigneeId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {employees?.data?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Priority</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon cursor-pointer"
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
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 4.0"
                      value={formEstimatedHours}
                      onChange={(e) => setFormEstimatedHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Due Date</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Task details and scope..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-none bg-[#f4f4f4] border border-[#e0e0e0] focus:outline-none focus:border-[#0f62fe] resize-none tracking-carbon"
                  />
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-xs font-normal rounded-none border border-[#e0e0e0] text-[#525252] hover:bg-[#f4f4f4] tracking-carbon"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                    className="px-4 py-2 text-xs font-normal rounded-none bg-[#0f62fe] text-white hover:bg-[#0043ce] disabled:opacity-50 tracking-carbon"
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
