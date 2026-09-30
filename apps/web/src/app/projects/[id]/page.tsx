'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import {
  FolderGit2,
  ChevronLeft,
  Users,
  CheckSquare,
  Clock,
  Briefcase,
  Plus,
  UserPlus,
  Edit2,
  DollarSign,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const projectId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'tasks' | 'members' | 'edit'>('tasks');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskError, setTaskError] = useState('');

  // Add member form state
  const [memberEmployeeId, setMemberEmployeeId] = useState('');
  const [memberRole, setMemberRole] = useState('CONTRIBUTOR');
  const [memberHourlyRate, setMemberHourlyRate] = useState('');
  const [memberError, setMemberError] = useState('');

  // Edit project state
  const [editStatus, setEditStatus] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudgetHours, setEditBudgetHours] = useState('');
  const [editClientName, setEditClientName] = useState('');

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId),
    enabled: !!projectId,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select'],
    queryFn: () => api.getEmployees({ limit: 100 }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (body: any) => api.createTask({ ...body, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setIsAddTaskOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskAssigneeId('');
      setTaskEstimatedHours('');
      setTaskDueDate('');
    },
    onError: (err: any) => setTaskError(err.message || 'Failed to create task'),
  });

  const addMemberMutation = useMutation({
    mutationFn: (body: any) => api.addProjectMember(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setIsAddMemberOpen(false);
      setMemberEmployeeId('');
      setMemberHourlyRate('');
    },
    onError: (err: any) => setMemberError(err.message || 'Failed to assign member'),
  });

  const updateProjectMutation = useMutation({
    mutationFn: (body: any) => api.updateProject(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      alert('Project updated successfully');
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading project details...</div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="py-24 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#da1e28] mx-auto" />
          <p className="text-sm font-normal text-[#161616] tracking-carbon">Project not found or access denied.</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal tracking-carbon transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </AppLayout>
    );
  }

  const tasks = project.tasks || [];
  const members = project.members || [];
  const totalTrackedSeconds = project.summary?.totalTrackedSeconds || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-[#525252] hover:text-[#0f62fe] font-normal transition-colors tracking-carbon"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>

        {/* Project Header Card */}
        <div className="bg-white border border-[#e0e0e0] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center text-white"
                style={{ backgroundColor: project.color || '#0f62fe' }}
              >
                <FolderGit2 className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-light text-[#161616] tracking-tight">{project.name}</h1>
                  {project.code && (
                    <span className="text-xs font-mono px-2 py-0.5 bg-[#f4f4f4] text-[#161616] border border-[#e0e0e0]">
                      {project.code}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 border tracking-carbon ${
                      project.status === 'ACTIVE'
                        ? 'bg-[#defbe6] text-[#0e6027] border-[#a7f0ba]'
                        : 'bg-[#f4f4f4] text-[#525252] border-[#e0e0e0]'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
                  {project.clientName ? `Client: ${project.clientName} • ` : ''}
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasPermission('tasks.create') && (
                <button
                  onClick={() => setIsAddTaskOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white text-xs font-normal tracking-carbon transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              )}

              {hasPermission('projects.edit') && (
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] text-xs font-normal tracking-carbon transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#525252]" />
                  <span>Assign Member</span>
                </button>
              )}
            </div>
          </div>

          {project.description && (
            <p className="text-xs text-[#525252] bg-[#f4f4f4] p-3 border border-[#e0e0e0] leading-relaxed tracking-carbon">
              {project.description}
            </p>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-[#f4f4f4] border border-[#e0e0e0]">
              <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-carbon">Tracked Time</span>
              <p className="text-xl font-light text-[#0f62fe] font-mono mt-0.5">
                {formatDuration(totalTrackedSeconds)}
              </p>
            </div>

            <div className="p-3 bg-[#f4f4f4] border border-[#e0e0e0]">
              <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-carbon">Budget</span>
              <p className="text-xl font-light text-[#161616] mt-0.5">
                {project.budgetHours ? `${project.budgetHours} hrs` : 'Unlimited'}
              </p>
            </div>

            <div className="p-3 bg-[#f4f4f4] border border-[#e0e0e0]">
              <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-carbon">Tasks Completed</span>
              <p className="text-xl font-light text-[#161616] mt-0.5">
                {tasks.filter((t: any) => t.status === 'DONE').length} / {tasks.length}
              </p>
            </div>

            <div className="p-3 bg-[#f4f4f4] border border-[#e0e0e0]">
              <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-carbon">Assigned Team</span>
              <p className="text-xl font-light text-[#161616] mt-0.5">{members.length} Members</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e0e0e0] gap-6 text-xs font-normal tracking-carbon">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'border-[#0f62fe] text-[#161616] font-semibold'
                : 'border-transparent text-[#525252] hover:text-[#161616]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-[#0f62fe] text-[#161616] font-semibold'
                : 'border-transparent text-[#525252] hover:text-[#161616]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members ({members.length})</span>
          </button>

          {hasPermission('projects.edit') && (
            <button
              onClick={() => {
                setActiveTab('edit');
                setEditStatus(project.status);
                setEditDescription(project.description || '');
                setEditBudgetHours(project.budgetHours ? String(project.budgetHours) : '');
                setEditClientName(project.clientName || '');
              }}
              className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'border-[#0f62fe] text-[#161616] font-semibold'
                  : 'border-transparent text-[#525252] hover:text-[#161616]'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Project Settings</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'tasks' && (
          <div className="bg-white border border-[#e0e0e0] overflow-hidden">
            {tasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#8c8c8c] space-y-3 tracking-carbon">
                <CheckSquare className="w-8 h-8 text-[#8c8c8c] mx-auto" />
                <p>No tasks created in this project yet.</p>
                {hasPermission('tasks.create') && (
                  <button
                    onClick={() => setIsAddTaskOpen(true)}
                    className="px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal tracking-carbon"
                  >
                    Add First Task
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tracking-carbon">
                  <thead className="bg-[#f4f4f4] text-[#525252] font-semibold border-b border-[#e0e0e0] uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Task Name</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Estimate</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {tasks.map((task: any) => {
                      const priorityTag =
                        task.priority === 'URGENT'
                          ? 'bg-[#ffebee] text-[#da1e28] border-[#ffb3ba]'
                          : task.priority === 'HIGH'
                          ? 'bg-[#fdf2cc] text-[#6d4f00] border-[#fbe499]'
                          : task.priority === 'MEDIUM'
                          ? 'bg-[#edf5ff] text-[#0043ce] border-[#a6c8ff]'
                          : 'bg-[#f4f4f4] text-[#525252] border-[#e0e0e0]';

                      return (
                        <tr key={task.id} className="hover:bg-[#f4f4f4] transition-colors">
                          <td className="py-3 px-4 font-normal text-[#161616]">
                            <div className="font-semibold text-[#161616]">{task.title}</div>
                            {task.description && (
                              <p className="text-[11px] text-[#525252] font-normal truncate max-w-sm mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#525252]">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-[#edf5ff] border border-[#a6c8ff] text-[#0043ce] text-[10px] font-semibold flex items-center justify-center">
                                  {task.assignee.firstName?.[0]}
                                </div>
                                <span className="text-[#161616]">{task.assignee.displayName}</span>
                              </div>
                            ) : (
                              <span className="text-[#8c8c8c] italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 border ${priorityTag}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateTaskStatusMutation.mutate({ taskId: task.id, status: e.target.value })
                              }
                              className="bg-[#f4f4f4] border border-[#e0e0e0] px-2 py-1 text-xs font-normal text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="IN_REVIEW">In Review</option>
                              <option value="DONE">Done</option>
                              <option value="BLOCKED">Blocked</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-[#161616] font-mono">
                            {task.estimatedHours ? `${task.estimatedHours}h` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-xs text-[#8c8c8c] font-mono">
                              {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white border border-[#e0e0e0] overflow-hidden">
            {members.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#8c8c8c] space-y-3 tracking-carbon">
                <Users className="w-8 h-8 text-[#8c8c8c] mx-auto" />
                <p>No team members assigned to this project yet.</p>
                {hasPermission('projects.edit') && (
                  <button
                    onClick={() => setIsAddMemberOpen(true)}
                    className="px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] text-white text-xs font-normal tracking-carbon"
                  >
                    Assign Member
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tracking-carbon">
                  <thead className="bg-[#f4f4f4] text-[#525252] font-semibold border-b border-[#e0e0e0] uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Designation / Dept</th>
                      <th className="py-3 px-4">Project Role</th>
                      <th className="py-3 px-4">Hourly Billing Rate</th>
                      <th className="py-3 px-4 text-right">Assigned On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {members.map((m: any) => (
                      <tr key={m.id} className="hover:bg-[#f4f4f4] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-[#edf5ff] border border-[#a6c8ff] text-[#0043ce] font-semibold text-xs flex items-center justify-center">
                              {m.employee?.firstName?.[0]}{m.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-[#161616]">{m.employee?.displayName}</p>
                              <p className="text-[10px] text-[#525252]">{m.employee?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#525252]">
                          {m.employee?.designation || 'Staff'} • {m.employee?.department?.name || 'General'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 bg-[#f4f4f4] text-[#161616] border border-[#e0e0e0]">
                            {m.role || 'CONTRIBUTOR'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#161616]">
                          {m.hourlyRate ? `$${m.hourlyRate}/hr` : 'Default'}
                        </td>
                        <td className="py-3 px-4 text-right text-[#8c8c8c] text-[11px] font-mono">
                          {new Date(m.createdAt || project.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="bg-white border border-[#e0e0e0] p-6 max-w-2xl space-y-4">
            <h3 className="font-semibold text-sm text-[#161616] border-b border-[#e0e0e0] pb-3 tracking-carbon">
              Edit Project Settings
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-normal text-[#525252] tracking-carbon">Project Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-normal text-[#525252] tracking-carbon">Client Name</label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-normal text-[#525252] tracking-carbon">Budget Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={editBudgetHours}
                  onChange={(e) => setEditBudgetHours(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-normal text-[#525252] tracking-carbon">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] resize-none tracking-carbon"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  disabled={updateProjectMutation.isPending}
                  onClick={() => {
                    updateProjectMutation.mutate({
                      status: editStatus,
                      clientName: editClientName || undefined,
                      budgetHours: editBudgetHours ? parseFloat(editBudgetHours) : undefined,
                      description: editDescription || undefined,
                    });
                  }}
                  className="px-4 py-2 text-xs font-normal bg-[#0f62fe] text-white hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-50 tracking-carbon transition-colors"
                >
                  {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create Task */}
        {isAddTaskOpen && (
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#161616] tracking-carbon">Add Task to {project.name}</h3>
                <button onClick={() => setIsAddTaskOpen(false)} className="p-1 text-[#525252] hover:text-[#161616]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!taskTitle.trim()) {
                    setTaskError('Task title is required');
                    return;
                  }
                  createTaskMutation.mutate({
                    title: taskTitle.trim(),
                    description: taskDescription.trim() || undefined,
                    priority: taskPriority,
                    assigneeId: taskAssigneeId || undefined,
                    estimatedHours: taskEstimatedHours ? parseFloat(taskEstimatedHours) : undefined,
                    dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
                  });
                }}
                className="p-5 space-y-3"
              >
                {taskError && (
                  <div className="p-2.5 bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {taskError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement OAuth login provider"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Assignee</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  >
                    <option value="">Unassigned</option>
                    {employees?.data?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 6.0"
                      value={taskEstimatedHours}
                      onChange={(e) => setTaskEstimatedHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Task details and acceptance criteria..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] resize-none tracking-carbon"
                  />
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddTaskOpen(false)}
                    className="px-4 py-2 text-xs font-normal border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] tracking-carbon transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                    className="px-4 py-2 text-xs font-normal bg-[#0f62fe] text-white hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-50 tracking-carbon transition-colors"
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Assign Member */}
        {isAddMemberOpen && (
          <div className="fixed inset-0 bg-[#161616]/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-[#e0e0e0] max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
                <h3 className="font-semibold text-sm text-[#161616] tracking-carbon">Assign Member to {project.name}</h3>
                <button onClick={() => setIsAddMemberOpen(false)} className="p-1 text-[#525252] hover:text-[#161616]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!memberEmployeeId) {
                    setMemberError('Please select an employee');
                    return;
                  }
                  addMemberMutation.mutate({
                    employeeId: memberEmployeeId,
                    role: memberRole,
                    hourlyRate: memberHourlyRate ? parseFloat(memberHourlyRate) : undefined,
                  });
                }}
                className="p-5 space-y-3"
              >
                {memberError && (
                  <div className="p-2.5 bg-[#ffebee] border border-[#ffb3ba] text-xs text-[#da1e28] tracking-carbon">
                    {memberError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-normal text-[#525252] tracking-carbon">Select Employee *</label>
                  <select
                    required
                    value={memberEmployeeId}
                    onChange={(e) => setMemberEmployeeId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                  >
                    <option value="">Choose employee...</option>
                    {employees?.data?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.displayName} ({emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Project Role</label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    >
                      <option value="CONTRIBUTOR">Contributor</option>
                      <option value="LEAD">Project Lead</option>
                      <option value="REVIEWER">Reviewer</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-normal text-[#525252] tracking-carbon">Hourly Rate ($)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 75"
                      value={memberHourlyRate}
                      onChange={(e) => setMemberHourlyRate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#f4f4f4] border border-[#e0e0e0] text-[#161616] focus:outline-none focus:border-[#0f62fe] tracking-carbon"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e0e0e0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2 text-xs font-normal border border-[#e0e0e0] bg-white hover:bg-[#f4f4f4] text-[#161616] tracking-carbon transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMemberMutation.isPending}
                    className="px-4 py-2 text-xs font-normal bg-[#0f62fe] text-white hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-50 tracking-carbon transition-colors"
                  >
                    {addMemberMutation.isPending ? 'Assigning...' : 'Assign Member'}
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
