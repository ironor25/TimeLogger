import React from 'react';
import { FolderGit2, CheckSquare, ChevronDown } from 'lucide-react';
import { Project, Task } from '../types';

interface ProjectTaskSelectorProps {
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  selectedTaskId: string;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
  disabled?: boolean;
}

export const ProjectTaskSelector: React.FC<ProjectTaskSelectorProps> = ({
  projects,
  tasks,
  selectedProjectId,
  selectedTaskId,
  onSelectProject,
  onSelectTask,
  disabled = false,
}) => {
  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 backdrop-blur-sm shadow-md space-y-3">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>Assigned Project & Task</span>
      </div>

      {/* Project Selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
          <FolderGit2 className="w-3 h-3 text-blue-400" />
          <span>Project</span>
        </label>
        <div className="relative">
          <select
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium appearance-none focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          >
            <option value="">-- No Project Selected --</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Task Selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
          <CheckSquare className="w-3 h-3 text-emerald-400" />
          <span>Task</span>
        </label>
        <div className="relative">
          <select
            value={selectedTaskId}
            onChange={(e) => onSelectTask(e.target.value)}
            disabled={disabled || !selectedProjectId}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium appearance-none focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          >
            <option value="">-- No Task Selected --</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} [{task.priority}]
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
