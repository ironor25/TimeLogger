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
    <header className="h-12 bg-white border-b border-[#e0e0e0] px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left Organization Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-[#161616] bg-[#f4f4f4] px-2.5 py-1 border border-[#e0e0e0] rounded-none">
          <Building className="w-3.5 h-3.5 text-[#0f62fe]" />
          <span className="font-medium text-[#161616]">{organization?.name || 'PulseTime'}</span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[11px] text-[#525252]">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-[#8c8c8c]" />
            <span>{organization?.timezone || 'Asia/Kolkata'}</span>
          </span>
          <span className="text-[#e0e0e0]">•</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#8c8c8c]" />
            <span>Day Reset: {organization?.dayResetTime || '04:00'}</span>
          </span>
        </div>
      </div>

      {/* Right Controls & User Info */}
      <div className="flex items-center gap-4">
        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#e0e0e0]">
          <div className="w-7 h-7 bg-[#edf5ff] border border-[#0f62fe]/30 text-[#0f62fe] flex items-center justify-center font-medium text-xs rounded-none">
            {employee?.displayName ? employee.displayName[0] : (user?.email ? user.email[0].toUpperCase() : 'U')}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-medium text-[#161616] leading-none">
              {employee?.displayName || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-[#525252] leading-tight mt-0.5 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-[#0f62fe]" />
              <span>{role || 'EMPLOYEE'}</span>
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-[#525252] hover:text-[#da1e28] hover:bg-[#f4f4f4] rounded-none transition-colors ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
