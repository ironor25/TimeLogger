'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  Camera,
  Image as ImageIcon,
  Radio,
  Users,
  FolderGit2,
  CheckSquare,
  FileCheck,
  CalendarOff,
  BarChart3,
  TrendingUp,
  Building2,
  CalendarRange,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { hasPermission, role, organization } = useAuth();
  const isManagement = role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';

  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Daily Overview', href: '/attendance', icon: CalendarCheck, permission: 'attendance.view' },
        { label: 'Work Timelines', href: '/timelines/daily', icon: Clock, permission: 'attendance.view' },
      ],
    },
    {
      title: 'MONITORING',
      items: [
        { label: 'User Screenshots', href: '/screenshots/users', icon: Camera, permission: 'screenshots.view' },
        ...(isManagement
          ? [
              { label: 'Project Screenshots', href: '/screenshots/projects', icon: ImageIcon, permission: 'screenshots.view' },
              { label: 'Monitoring Room', href: '/screenshots/monitoring', icon: Radio, permission: 'screenshots.view', badge: 'Live' },
            ]
          : []),
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        ...(isManagement
          ? [{ label: 'Employees', href: '/employees', icon: Users, permission: 'employees.view' }]
          : []),
        { label: 'Projects', href: '/projects', icon: FolderGit2, permission: 'projects.view' },
        { label: 'Tasks', href: '/tasks', icon: CheckSquare, permission: 'tasks.view' },
        ...(isManagement
          ? [{ label: 'Time Approvals', href: '/time/approvals', icon: FileCheck, permission: 'attendance.approve' }]
          : []),
        { label: 'Leave Requests', href: '/leaves/requests', icon: CalendarOff, permission: 'leaves.view' },
      ],
    },
    ...(isManagement
      ? [
          {
            title: 'REPORTS & PRODUCTIVITY',
            items: [
              { label: 'Employee Summary', href: '/reports/employee-summary', icon: BarChart3, permission: 'reports.view' },
              { label: 'Activity Analytics', href: '/reports/activity', icon: TrendingUp, permission: 'reports.view' },
            ],
          },
          {
            title: 'SETTINGS',
            items: [
              { label: 'Organization Settings', href: '/settings/company', icon: Building2, permission: 'settings.view' },
              { label: 'Work Schedules', href: '/settings/work-schedules', icon: CalendarRange, permission: 'settings.view' },
              { label: 'Roles & Permissions', href: '/settings/roles', icon: ShieldCheck, permission: 'roles.view' },
            ],
          },
        ]
      : []),
  ];


  return (
    <aside className="w-64 bg-[#161616] text-[#c6c6c6] flex flex-col h-screen fixed left-0 top-0 border-r border-[#262626] z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[#262626] bg-[#161616]">
        <div className="w-8 h-8 bg-[#0f62fe] flex items-center justify-center text-white">
          <Timer className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-sm text-white tracking-tight">TimeLogger</span>
          <span className="text-[11px] text-[#8c8c8c] font-normal truncate max-w-[140px]">
            {organization?.name || 'Enterprise'}
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-0 space-y-6">
        {sections.map((sec, idx) => {
          const visibleItems = sec.items.filter((item) => !item.permission || hasPermission(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-4 text-[11px] font-normal text-[#8c8c8c] uppercase tracking-wider">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 text-xs font-normal transition-colors rounded-none border-l-4 tracking-carbon',
                        isActive
                          ? 'bg-[#262626] text-white border-[#0f62fe] font-medium'
                          : 'border-transparent text-[#c6c6c6] hover:bg-[#262626] hover:text-white',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-4 h-4', isActive ? 'text-[#0f62fe]' : 'text-[#8c8c8c]')} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-normal px-1.5 py-0.5 bg-[#0f62fe] text-white rounded-none">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role / Version Footer */}
      <div className="p-4 border-t border-[#262626] bg-[#161616] text-[11px] text-[#8c8c8c] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#24a148] inline-block"></span>
          <span>v1.0 • Multi-tenant</span>
        </span>
        <span className="px-1.5 py-0.5 bg-[#262626] text-[10px] font-normal text-[#c6c6c6] rounded-none uppercase">
          {role || 'EMPLOYEE'}
        </span>
      </div>
    </aside>
  );
}
