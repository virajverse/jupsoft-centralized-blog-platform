'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { UserAccount, UserRole } from '../../types';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Check, 
  X, 
  Globe, 
  Mail, 
  Trash2, 
  Edit3, 
  KeyRound,
  Lock,
  Layers
} from 'lucide-react';

const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Editor',
  'Content Writer',
  'Publisher',
  'SEO Manager',
];

interface RBACPermission {
  id: string;
  label: string;
  description: string;
  allowedRoles: UserRole[];
}

const PERMISSIONS_MATRIX: RBACPermission[] = [
  {
    id: 'blog.create',
    label: 'Create Draft Articles',
    description: 'Can initiate new article drafts in editor',
    allowedRoles: ['Super Admin', 'Editor', 'Content Writer'],
  },
  {
    id: 'blog.edit_own',
    label: 'Edit Own Drafts',
    description: 'Can edit content authored by self',
    allowedRoles: ['Super Admin', 'Editor', 'Content Writer'],
  },
  {
    id: 'blog.edit_assigned',
    label: 'Edit Any Article',
    description: 'Can edit posts written by any author across tenant',
    allowedRoles: ['Super Admin', 'Editor'],
  },
  {
    id: 'blog.review_approve',
    label: 'Review & Approve Posts',
    description: 'Can accept/reject drafts in workflow kanban',
    allowedRoles: ['Super Admin', 'Editor'],
  },
  {
    id: 'blog.publish_schedule',
    label: 'Publish & Schedule to Live CDN',
    description: 'Can trigger live publishing and dispatch ISR webhooks',
    allowedRoles: ['Super Admin', 'Publisher'],
  },
  {
    id: 'seo.edit',
    label: 'Edit SEO & Social Studio',
    description: 'Can edit meta tags, canonicals, robots & Open Graph',
    allowedRoles: ['Super Admin', 'Editor', 'SEO Manager'],
  },
  {
    id: 'site.manage',
    label: '301 Redirects & Taxonomy',
    description: 'Can add 301 redirects, categories, and tags',
    allowedRoles: ['Super Admin', 'Publisher'],
  },
  {
    id: 'users.manage',
    label: 'Team & RBAC Management',
    description: 'Can invite users, modify roles, and change system settings',
    allowedRoles: ['Super Admin'],
  },
];

export const UserManagementView: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    users, 
    websites, 
    activeWebsiteId, 
    addUser, 
    updateUser, 
    deleteUser, 
    showNotification 
  } = useBlogStore();

  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  const tabParam = (searchParams.get('tab') as 'users' | 'matrix') || 'users';
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>(tabParam);

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite Form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteWebsiteId, setInviteWebsiteId] = useState<string>(activeWebsiteId === 'all' ? websites[0]?.id : activeWebsiteId);
  const [inviteRole, setInviteRole] = useState<UserRole>('Content Writer');

  // Edit User Form state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('Editor');
  const [editWebsiteId, setEditWebsiteId] = useState<string>(activeWebsiteId === 'all' ? websites[0]?.id : activeWebsiteId);
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    const targetSiteId = activeWebsiteId === 'all' ? (websites[0]?.id || '') : activeWebsiteId;
    setEditWebsiteId(targetSiteId);
    setEditRole((u.roleAssignments[targetSiteId] || u.roleAssignments['all'] || 'Content Writer') as UserRole);
    setEditStatus(u.status);
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedRoles = {
      ...editingUser.roleAssignments,
      [editWebsiteId]: editRole,
    };

    updateUser(editingUser.id, {
      roleAssignments: updatedRoles,
      status: editStatus,
    });

    showNotification(`Updated role for ${editingUser.name} on ${websites.find(w => w.id === editWebsiteId)?.name || 'Network'}`, 'success');
    setEditingUser(null);
  };

  const handleTabChange = (tab: 'users' | 'matrix') => {
    setActiveTab(tab);
    setParam('tab', tab === 'users' ? null : tab);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showNotification('Please provide both name and email.', 'warning');
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80`,
      roleAssignments: {
        [inviteWebsiteId]: inviteRole,
      },
      status: 'active',
      lastLoginIp: '192.168.1.105',
      createdAt: new Date().toISOString(),
    };

    addUser(newUser);
    setIsInviteOpen(false);
    setInviteName('');
    setInviteEmail('');
    showNotification(`Invitation sent to ${newUser.email} with role ${inviteRole}`, 'success');
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Team &amp; Access Control (RBAC)
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              TRD Section 7
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Granular role-based permissions scoped per website tenant. Manage invitations, status, and capabilities.
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#0f172a] p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800 shadow-2xs">
        <button
          onClick={() => handleTabChange('users')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Team Members ({users.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('matrix')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'matrix'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RBAC Permissions Matrix</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Organization Accounts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tenant-scoped role assignments dictating editorial and publishing rights.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">User Details</th>
                  <th className="py-3 px-4 font-semibold">Tenant Role Assignments</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Last Login IP</th>
                  <th className="py-3 px-4 font-semibold">Joined Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const assignedTenants = Object.entries(u.roleAssignments);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {assignedTenants.map(([siteId, role]) => {
                              const site = websites.find((w) => w.id === siteId);
                              const siteName = siteId === 'all' ? 'All Tenants' : (site?.name || siteId);
                              return (
                                <span
                                  key={siteId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                >
                                  <span className="font-normal text-slate-500 dark:text-slate-400">{siteName}:</span>
                                  <span>{role}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              const nextStatus = u.status === 'active' ? 'suspended' : 'active';
                              updateUser(u.id, { status: nextStatus });
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold cursor-pointer border text-[11px] transition-colors ${
                              u.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {u.status === 'active' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                <span>Suspended</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {u.lastLoginIp}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Edit User Role & Scope"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Remove access for ${u.name}?`)) {
                                  deleteUser(u.id);
                                }
                              }}
                              title="Revoke User"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800/60"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RBAC MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-500" />
              Role-Based Access Control (RBAC) Entitlement Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strictly enforced in NestJS guards (`@Roles(...)`) and verified on every mutating API endpoint.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold min-w-[200px]">Permission Scope</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role} className="py-3 px-3 font-semibold text-center whitespace-nowrap">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {PERMISSIONS_MATRIX.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{perm.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{perm.description}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{perm.id}</div>
                    </td>

                    {ALL_ROLES.map((role) => {
                      const isAllowed = perm.allowedRoles.includes(role);
                      return (
                        <td key={role} className="py-3 px-3 text-center">
                          {isAllowed ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600">
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INVITE MEMBER */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Invite Organization Member
                </h2>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Green"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="rachel@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Assignment Scope
                </label>
                <select
                  value={inviteWebsiteId}
                  onChange={(e) => setInviteWebsiteId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="all">All Websites (Network Wide)</option>
                  {websites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Edit User Permissions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update role assignments and platform access
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Identity Snapshot */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 mb-5">
              <img
                src={editingUser.avatar}
                alt={editingUser.name}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                  {editingUser.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                  {editingUser.email}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                editingUser.status === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
              }`}>
                {editingUser.status}
              </span>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Scope
                </label>
                <select
                  value={editWebsiteId}
                  onChange={(e) => {
                    const newWebId = e.target.value;
                    setEditWebsiteId(newWebId);
                    if (editingUser) {
                      setEditRole((editingUser.roleAssignments[newWebId] || editingUser.roleAssignments['all'] || 'Content Writer') as UserRole);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="all">All Websites (Network Wide)</option>
                  {websites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Role for this Scope
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Roles define permissions for drafting, approving, publishing, and SEO configurations.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      editStatus === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Active Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('suspended')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      editStatus === 'suspended'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Suspended</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
