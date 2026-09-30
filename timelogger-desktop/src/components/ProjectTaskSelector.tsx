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
    <div className="bg-[#262626] border border-[#393939] rounded-none p-4 space-y-3 font-sans tracking-carbon">
      <div className="text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider flex items-center justify-between">
        <span>Assigned Project & Task</span>
      </div>

      {/* Project Selector */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-[#c6c6c6] flex items-center gap-1.5">
          <FolderGit2 className="w-3.5 h-3.5 text-[#0f62fe]" />
          <span>Project</span>
        </label>
        <div className="relative">
          <select
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            disabled={disabled}
            className="w-full bg-[#161616] border border-[#393939] rounded-none px-3 py-2 text-xs text-[#ffffff] font-normal appearance-none focus:outline-none focus:border-[#0f62fe] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <option value="">-- No Project Selected --</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8c8c8c] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Task Selector */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-[#c6c6c6] flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-[#24a148]" />
          <span>Task</span>
        </label>
        <div className="relative">
          <select
            value={selectedTaskId}
            onChange={(e) => onSelectTask(e.target.value)}
            disabled={disabled || !selectedProjectId}
            className="w-full bg-[#161616] border border-[#393939] rounded-none px-3 py-2 text-xs text-[#ffffff] font-normal appearance-none focus:outline-none focus:border-[#0f62fe] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <option value="">-- No Task Selected --</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} [{task.priority}]
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8c8c8c] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
