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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
          <div>
            <h1 className="text-2xl font-light text-[#161616] tracking-tight">Roles & Permissions (RBAC)</h1>
            <p className="text-xs text-[#525252] mt-0.5 tracking-carbon">
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
                className="bg-white border border-[#e0e0e0] p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#161616] tracking-carbon">{r.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 border tracking-carbon ${
                        isSystem
                          ? 'bg-[#f4f4f4] text-[#525252] border-[#e0e0e0]'
                          : 'bg-[#edf5ff] text-[#0043ce] border-[#a6c8ff]'
                      }`}
                    >
                      {isSystem ? 'System' : 'Custom'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#525252] mt-1 line-clamp-2 tracking-carbon">
                    {r.description || 'Predefined role with system access constraints.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#e0e0e0] flex items-center justify-between text-[11px] text-[#8c8c8c] tracking-carbon">
                  <span>{permCount} permissions</span>
                  <span className="font-semibold text-[#161616] font-mono">{assignedUsers} users</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Matrix View */}
        <div className="bg-white border border-[#e0e0e0] overflow-hidden">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f4f4f4]">
            <h2 className="text-xs font-semibold text-[#161616] uppercase tracking-carbon flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0f62fe]" />
              <span>Permission Capability Matrix</span>
            </h2>
            <span className="text-[11px] text-[#8c8c8c] font-mono">{permissions.length} total capabilities</span>
          </div>

          {rolesLoading || permsLoading ? (
            <div className="p-16 text-center text-xs text-[#8c8c8c] tracking-carbon">Loading access matrix...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tracking-carbon">
                <thead>
                  <tr className="bg-[#f4f4f4] border-b border-[#e0e0e0] text-[#525252] font-semibold text-[11px] uppercase">
                    <th className="py-3 px-4 w-72">Permission / Capability</th>
                    {roles.map((r: any) => (
                      <th key={r.id} className="py-3 px-4 text-center font-semibold text-[#161616]">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(permissionsByModule).map(([modName, perms]: [string, any]) => (
                    <React.Fragment key={modName}>
                      <tr className="bg-[#f4f4f4] border-y border-[#e0e0e0]">
                        <td
                          colSpan={roles.length + 1}
                          className="py-2 px-4 font-semibold text-[11px] text-[#0f62fe] uppercase tracking-carbon"
                        >
                          Module: {modName}
                        </td>
                      </tr>

                      {perms.map((p: any) => (
                        <tr key={p.id} className="border-b border-[#e0e0e0] hover:bg-[#f4f4f4] transition-colors">
                          <td className="py-2.5 px-4 font-normal text-[#161616]">
                            <div className="font-semibold text-[#161616]">{p.displayName || p.name}</div>
                            {p.description && (
                              <p className="text-[10px] text-[#525252] font-normal">{p.description}</p>
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
                                  <div className="inline-flex items-center justify-center w-5 h-5 bg-[#defbe6] text-[#0e6027] border border-[#a7f0ba]">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center w-5 h-5 bg-[#f4f4f4] text-[#8c8c8c] border border-[#e0e0e0]">
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
