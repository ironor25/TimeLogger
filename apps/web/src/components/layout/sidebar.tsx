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
        { label: 'Project Screenshots', href: '/screenshots/projects', icon: ImageIcon, permission: 'screenshots.view' },
        { label: 'Monitoring Room', href: '/screenshots/monitoring', icon: Radio, permission: 'screenshots.view', badge: 'Live' },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { label: 'Employees', href: '/employees', icon: Users, permission: 'employees.view' },
        { label: 'Projects', href: '/projects', icon: FolderGit2, permission: 'projects.view' },
        { label: 'Tasks', href: '/tasks', icon: CheckSquare, permission: 'tasks.view' },
        { label: 'Time Approvals', href: '/time/approvals', icon: FileCheck, permission: 'attendance.approve' },
        { label: 'Leave Requests', href: '/leaves/requests', icon: CalendarOff, permission: 'leaves.view' },
      ],
    },
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
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Timer className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base text-white tracking-tight">PulseTime</span>
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
            {organization?.name || 'Enterprise SaaS'}
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((sec, idx) => {
          const visibleItems = sec.items.filter((item) => !item.permission || hasPermission(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-semibold text-slate-400 tracking-wider">
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
                        'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
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
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span>v1.0 • Multi-tenant</span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-300 uppercase">
          {role || 'EMPLOYEE'}
        </span>
      </div>
    </aside>
  );
}
