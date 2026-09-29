'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Bell,
  Search,
  Globe,
  Clock,
  LogOut,
  User,
  Shield,
  Building,
} from 'lucide-react';

export function Topbar() {
  const { user, employee, organization, role, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left Organization Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200/80">
          <Building className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800">{organization?.name || 'PulseTime'}</span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{organization?.timezone || 'Asia/Kolkata'}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Day Reset: {organization?.dayResetTime || '04:00'}</span>
          </span>
        </div>
      </div>

      {/* Right Controls & User Info */}
      <div className="flex items-center gap-4">
        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
            {employee?.displayName ? employee.displayName[0] : (user?.email ? user.email[0].toUpperCase() : 'U')}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-none">
              {employee?.displayName || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight mt-0.5 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-blue-600" />
              <span>{role || 'EMPLOYEE'}</span>
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
