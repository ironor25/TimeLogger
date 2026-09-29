'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  Check,
  X,
  Users,
  Lock,
  Layers,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function RolesPermissionsPage() {
  const { hasPermission } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
  });

  const { data: permissionsData, isLoading: permsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.getPermissions(),
  });

  const roles = Array.isArray(rolesData) ? rolesData : [];
  const permissions = Array.isArray(permissionsData) ? permissionsData : [];

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    const mod = p.module || 'General';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Roles & Permissions (RBAC)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Role-based access control matrix governing feature permissions and workforce privileges
            </p>
          </div>
        </div>

        {/* Roles Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {roles.map((r: any) => {
            const isSystem = r.isSystem;
            const assignedUsers = r._count?.userRoles || r.userRoles?.length || 0;
            const permCount = r.rolePermissions?.length || 0;

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{r.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSystem ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {isSystem ? 'System' : 'Custom'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {r.description || 'Predefined role with system access constraints.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{permCount} permissions</span>
                  <span className="font-semibold text-slate-700">{assignedUsers} users</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Matrix View */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Permission Capability Matrix</span>
            </h2>
            <span className="text-[11px] text-slate-400">{permissions.length} total capabilities</span>
          </div>

          {rolesLoading || permsLoading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading access matrix...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-72">Permission / Capability</th>
                    {roles.map((r: any) => (
                      <th key={r.id} className="py-3 px-4 text-center font-bold">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(permissionsByModule).map(([modName, perms]: [string, any]) => (
                    <React.Fragment key={modName}>
                      <tr className="bg-slate-50/80 border-y border-slate-200">
                        <td
                          colSpan={roles.length + 1}
                          className="py-2 px-4 font-bold text-[11px] text-blue-700 uppercase tracking-wider"
                        >
                          Module: {modName}
                        </td>
                      </tr>

                      {perms.map((p: any) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-medium text-slate-800">
                            <div>{p.displayName || p.name}</div>
                            {p.description && (
                              <p className="text-[10px] text-slate-400 font-normal">{p.description}</p>
                            )}
                          </td>

                          {roles.map((r: any) => {
                            // Check if this role has this permission
                            const rolePerms = r.rolePermissions || [];
                            const hasPerm =
                              r.name === 'OWNER' ||
                              rolePerms.some((rp: any) => rp.permissionId === p.id || rp.permission?.id === p.id);

                            return (
                              <td key={r.id} className="py-2.5 px-4 text-center">
                                {hasPerm ? (
                                  <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-300">
                                    <X className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
