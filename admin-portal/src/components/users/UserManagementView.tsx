'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { useQueryState } from '../../hooks/useQueryState';
import { UserAccount, UserRole, Website } from '../../types';
import { getAllowedInviteRoles, canManageUsers, isGlobalScopeRole, cleanAvatarUrl, getDefaultRoleModules, AppModule } from '../../utils/permissions';
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
  Shield,
  Crown,
  Network,
  ChevronRight,
  Building2,
  ArrowUpRight,
  Briefcase,
  Share2,
  MessageSquare,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Boxes,
  FileText,
  Kanban,
  Image as ImageIcon,
  Tags,
  ArrowRightLeft,
  BarChart3,
  Settings,
  Lock,
  Unlock,
  RotateCcw
} from 'lucide-react';

export const PLUGIN_MODULES: {
  id: AppModule;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'blogs', name: 'Blog Studio', desc: 'Writing, editing & translations', icon: FileText },
  { id: 'workflow', name: 'Workflow Kanban', desc: 'Review & approval pipeline', icon: Kanban },
  { id: 'media', name: 'Media Library', desc: 'Uploads & WebP compression', icon: ImageIcon },
  { id: 'taxonomy', name: 'Taxonomy & Tags', desc: 'Categories & hashtag tagging', icon: Tags },
  { id: 'redirects', name: '301 Redirects', desc: 'Permanent URL migration rules', icon: ArrowRightLeft },
  { id: 'analytics', name: 'Analytics Hub', desc: 'Traffic & author performance', icon: BarChart3 },
  { id: 'users', name: 'Team & RBAC', desc: 'User management & permissions', icon: Users },
  { id: 'settings', name: 'Tenant Settings', desc: 'API keys, webhooks & site settings', icon: Settings },
];

export const DELEGATABLE_ROLES: { role: UserRole; label: string; desc: string }[] = [
  { role: 'Editor', label: 'Editor', desc: 'Reviews drafts, requests revisions & approves' },
  { role: 'Content Writer', label: 'Content Writer', desc: 'Authors drafts and submits for review' },
  { role: 'SEO Manager', label: 'SEO Manager', desc: 'Configures metadata, canonicals and tags' },
  { role: 'Publisher', label: 'Publisher', desc: 'Releases approved blogs live to CDN' },
];

const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Website Admin',
  'Role Admin',
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
    label: 'Create Draft Blogs',
    description: 'Can initiate new blog drafts in editor',
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer'],
  },
  {
    id: 'blog.edit_own',
    label: 'Edit Own Drafts',
    description: 'Can edit content authored by self',
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer'],
  },
  {
    id: 'blog.edit_assigned',
    label: 'Edit Any Blog',
    description: 'Can edit blogs written by any author across tenant',
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor'],
  },
  {
    id: 'blog.review_approve',
    label: 'Review & Approve Posts',
    description: 'Can accept/reject drafts in workflow kanban',
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor'],
  },
  {
    id: 'blog.publish_schedule',
    label: 'Publish & Schedule to Live CDN',
    description: 'Can trigger live publishing and dispatch ISR webhooks',
    allowedRoles: ['Super Admin', 'Website Admin', 'Publisher'],
  },
  {
    id: 'seo.edit',
    label: 'Edit SEO & Social Studio',
    description: 'Can edit meta tags, canonicals, robots & Open Graph',
    allowedRoles: ['Super Admin', 'Website Admin', 'Editor', 'SEO Manager'],
  },
  {
    id: 'site.manage',
    label: '301 Redirects & Taxonomy',
    description: 'Can add 301 redirects, categories, and tags',
    allowedRoles: ['Super Admin', 'Website Admin', 'Publisher', 'SEO Manager'],
  },
  {
    id: 'users.manage',
    label: 'Team & RBAC Management',
    description: 'Can invite users, modify roles, and change tenant settings',
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin'],
  },
];

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const specials = '!@#$%&*';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const spec = specials.charAt(Math.floor(Math.random() * specials.length));
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Jupsoft@${num}${spec}${rand}`;
}

function renderUserAvatar(avatar?: string | null, name?: string, sizeClasses = 'w-8 h-8 text-xs') {
  const safeAvatar = cleanAvatarUrl(avatar);
  if (safeAvatar && safeAvatar.trim() !== '') {
    return (
      <img
        src={safeAvatar}
        alt={name || 'User avatar'}
        className={`${sizeClasses} rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0`}
      />
    );
  }
  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase();
  return (
    <div
      className={`${sizeClasses} rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-800 shrink-0 select-none`}
    >
      {initial}
    </div>
  );
}

export const UserManagementView: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    users, 
    websites, 
    activeWebsiteId, 
    activeRole,
    currentUser,
    fetchUsers,
    addUser, 
    updateUser, 
    deleteUser, 
    resetUserPassword,
    showNotification 
  } = useBlogStore(
    useShallow((s) => ({
      users: s.users,
      websites: s.websites,
      activeWebsiteId: s.activeWebsiteId,
      activeRole: s.activeRole,
      currentUser: s.currentUser,
      fetchUsers: s.fetchUsers,
      addUser: s.addUser,
      updateUser: s.updateUser,
      deleteUser: s.deleteUser,
      resetUserPassword: s.resetUserPassword,
      showNotification: s.showNotification,
    }))
  );

  const isSuperAdmin = isGlobalScopeRole(activeRole);
  const allowedRoles = getAllowedInviteRoles(activeRole);
  const visibleWebsites = isSuperAdmin
    ? websites
    : websites.filter((w) => currentUser?.roleAssignments?.[w.id]);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setIsLoadingUsers(true);
    });
    fetchUsers().finally(() => {
      if (active) setIsLoadingUsers(false);
    });
    return () => { active = false; };
  }, [fetchUsers]);

  const handleDeleteUser = async (id: string, name: string) => {
    if (deletingUserId) return;
    if (!confirm(`Remove access for ${name}?`)) return;
    setDeletingUserId(id);
    try {
      await deleteUser(id);
    } finally {
      setDeletingUserId(null);
    }
  };

  const tabParam = (searchParams.get('tab') as 'hierarchy' | 'directory' | 'matrix') || 'directory';
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'directory' | 'matrix'>(tabParam);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Dedicated Website Admin Team Inspection Modal
  const [inspectingWebsite, setInspectingWebsite] = useState<Website | null>(null);

  const getInvitationText = (user: UserAccount, site?: Website, password?: string) => {
    const websiteName = site?.name || 'Jupsoft Cloud & ERP';
    const domain = site?.domain || 'cloud.jupsoft.com';
    const roleName = user.roleAssignments[site?.id || ''] || user.roleAssignments['all'] || 'Team Member';
    const managedScope = roleName === 'Role Admin' && user.managedRoles && user.managedRoles.length > 0
      ? `\n🛡️ *Managed Roles Scope:* ${user.managedRoles.join(', ')}`
      : '';
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : `https://${domain}/login`;
    const pwd = password || user.tempPassword || 'Provided by Administrator';

    return `🚀 *Welcome to Jupsoft CMS!*

Your team account has been configured for *${websiteName}* (${domain}).

🌐 *Login Portal:* ${portalUrl}
📧 *User ID / Email:* ${user.email}
🔑 *Temporary Password:* ${pwd}
💼 *Role:* ${roleName}${managedScope}

_Please log in and update your password on your first sign-in._`;
  };

  // Invite Form state
  const defaultInviteSite = activeWebsiteId !== 'all' ? activeWebsiteId : (visibleWebsites[0]?.id || websites[0]?.id || '');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteWebsiteId, setInviteWebsiteId] = useState<string>(defaultInviteSite);
  const [inviteRole, setInviteRole] = useState<UserRole>(allowedRoles[0] || 'Content Writer');
  const [inviteManagedRoles, setInviteManagedRoles] = useState<UserRole[]>(['Editor', 'Content Writer']);
  const [invitePassword, setInvitePassword] = useState(() => generateStrongPassword());
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [inviteCustomModules, setInviteCustomModules] = useState<AppModule[]>(() => getDefaultRoleModules(allowedRoles[0] || 'Content Writer'));

  const handleInviteRoleChange = (newRole: UserRole) => {
    setInviteRole(newRole);
    setInviteCustomModules(getDefaultRoleModules(newRole));
  };

  const toggleInviteModule = (modId: AppModule) => {
    setInviteCustomModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const resetInviteModulesToDefault = () => {
    setInviteCustomModules(getDefaultRoleModules(inviteRole));
  };

  // Edit User Form state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('Editor');
  const [editWebsiteId, setEditWebsiteId] = useState<string>(defaultInviteSite);
  const [editManagedRoles, setEditManagedRoles] = useState<UserRole[]>(['Editor', 'Content Writer']);
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editCustomModules, setEditCustomModules] = useState<AppModule[]>([]);
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);

  const handleEditRoleChange = (newRole: UserRole) => {
    setEditRole(newRole);
    setEditCustomModules(getDefaultRoleModules(newRole));
  };

  const toggleEditModule = (modId: AppModule) => {
    setEditCustomModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const resetEditModulesToDefault = () => {
    setEditCustomModules(getDefaultRoleModules(editRole));
  };

  // Share Credentials Modal (WhatsApp / Email / Copy)
  const [shareModalData, setShareModalData] = useState<{ user: UserAccount; website?: Website; tempPassword?: string } | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showSharePassword, setShowSharePassword] = useState(true);

  const handleShareWhatsApp = (user: UserAccount, site?: Website, password?: string) => {
    const text = getInvitationText(user, site, password);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = (user: UserAccount, site?: Website, password?: string) => {
    const websiteName = site?.name || 'Jupsoft Cloud & ERP';
    const subject = `Your Jupsoft CMS Account Credentials - ${websiteName}`;
    const text = getInvitationText(user, site, password).replace(/\*/g, '');
    const url = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleResetUserPassword = async (userId: string) => {
    setIsResettingPassword(true);
    try {
      const res = await resetUserPassword(userId);
      if (res.success && res.tempPassword) {
        setShareModalData((prev) => prev ? { ...prev, tempPassword: res.tempPassword } : null);
        showNotification(`New temporary password generated: ${res.tempPassword}`, 'success');
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyInvite = (user: UserAccount, site?: Website, password?: string) => {
    const text = getInvitationText(user, site, password);
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleOpenEdit = (u: UserAccount, preselectedWebsiteId?: string) => {
    setEditingUser(u);
    const targetSiteId = preselectedWebsiteId || (activeWebsiteId === 'all' ? (visibleWebsites[0]?.id || websites[0]?.id || '') : activeWebsiteId);
    setEditWebsiteId(targetSiteId);
    const assigned = (u.roleAssignments[targetSiteId] || u.roleAssignments['all'] || allowedRoles[0] || 'Content Writer') as UserRole;
    setEditRole(assigned);
    setEditManagedRoles(u.managedRoles && u.managedRoles.length > 0 ? u.managedRoles : ['Editor', 'Content Writer']);
    setEditStatus(u.status);
    setEditCustomModules(
      u.customModules && u.customModules.length > 0
        ? [...u.customModules]
        : getDefaultRoleModules(assigned)
    );
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isSavingUserEdit) return;

    setIsSavingUserEdit(true);
    try {
      const updatedRoles = {
        ...editingUser.roleAssignments,
        [editWebsiteId]: editRole,
      };

      await updateUser(editingUser.id, {
        roleAssignments: updatedRoles,
        managedRoles: editRole === 'Role Admin' ? (editManagedRoles.length > 0 ? editManagedRoles : (['Editor', 'Content Writer'] as UserRole[])) : undefined,
        customModules: editCustomModules,
        status: editStatus,
      });

      showNotification(`Updated role and module access for ${editingUser.name}`, 'success');
      setEditingUser(null);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to update user', 'warning');
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  const handleTabChange = (tab: 'hierarchy' | 'directory' | 'matrix') => {
    setActiveTab(tab);
    setParam('tab', tab === 'hierarchy' ? null : tab);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || isSubmittingInvite) {
      if (!inviteName.trim() || !inviteEmail.trim()) {
        showNotification('Please provide both name and email.', 'warning');
      }
      return;
    }

    setIsSubmittingInvite(true);
    const assignedTempPassword = invitePassword.trim() || generateStrongPassword();
    const assignedManagedRoles: UserRole[] | undefined = inviteRole === 'Role Admin' 
      ? (inviteManagedRoles.length > 0 ? inviteManagedRoles : (['Editor', 'Content Writer'] as UserRole[]))
      : undefined;

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      avatar: '/uploads/avatars/avatar-default.webp',
      roleAssignments: {
        [inviteWebsiteId]: inviteRole,
      },
      managedRoles: assignedManagedRoles,
      customModules: inviteCustomModules,
      tempPassword: assignedTempPassword,
      status: 'active',
      lastLoginIp: '',
      createdAt: new Date().toISOString(),
    };

    try {
      await addUser(newUser);
      showNotification(`Created account for ${inviteName} as ${inviteRole}`, 'success');
      setIsInviteOpen(false);

      // Immediately trigger Credentials Share Modal so admin can dispatch via WhatsApp or Email
      const targetSite = websites.find((w) => w.id === inviteWebsiteId);
      setShareModalData({
        user: newUser,
        website: targetSite,
        tempPassword: assignedTempPassword,
      });

      // Reset inputs with freshly generated password for next action
      setInviteName('');
      setInviteEmail('');
      setInvitePassword(generateStrongPassword());
      setInviteManagedRoles(['Editor', 'Content Writer']);
      setInviteCustomModules(getDefaultRoleModules(allowedRoles[0] || 'Content Writer'));
    } catch {
      // Error notification is handled by store
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (roleFilter !== 'all') {
      const roles = Object.values(u.roleAssignments || {});
      if (!roles.includes(roleFilter as UserRole)) return false;
    }
    if (tenantFilter !== 'all') {
      const siteIds = Object.keys(u.roleAssignments || {});
      if (!siteIds.includes('all') && !siteIds.includes(tenantFilter)) return false;
    }
    return true;
  });

  // Segregate Super Admins (Global Governance)
  const superAdmins = users.filter((u) => 
    Object.values(u.roleAssignments || {}).includes('Super Admin')
  );

  // Role Badge Color Mapping
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Website Admin':
        return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Role Admin':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Editor':
        return 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'Content Writer':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Publisher':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'SEO Manager':
        return 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Team Governance &amp; RBAC Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage organization members, tenant-scoped role assignments, and role-based access control policies.
            </p>
          </div>
        </div>

        {canManageUsers(activeRole) && (
          <button
            onClick={() => {
              setInviteRole(allowedRoles[0] || 'Content Writer');
              setInviteWebsiteId(defaultInviteSite);
              setIsInviteOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Executive Metric Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Members</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {users.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Active across organization
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Accounts</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {users.filter((u) => u.status === 'active').length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Authorized to sign in
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Administrators</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Crown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {users.filter((u) => Object.values(u.roleAssignments || {}).some((r) => r === 'Super Admin' || r === 'Website Admin')).length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Global &amp; Tenant Admins
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tenants Covered</span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <Globe className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2 font-mono">
            {websites.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-tenant workspaces
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-fit scrollbar-none">
          <button
            onClick={() => handleTabChange('directory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'directory'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member Directory ({users.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('hierarchy')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'hierarchy'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>By Website Hierarchy</span>
          </button>

          <button
            onClick={() => handleTabChange('matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role Permissions Matrix</span>
          </button>
        </div>

        {/* Global Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {activeTab === 'directory' && (
            <>
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Website Filter */}
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Websites</option>
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: 🌳 DELEGATED TEAM HIERARCHY (EXECUTIVE VIEW)                  */}
      {/* ===================================================================== */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Super Administrators */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Super Administrators
                    </h2>
                  </div>
                </div>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  Global Scope
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {superAdmins.map((admin) => (
                  <div 
                    key={admin.id}
                    className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {renderUserAvatar(admin.avatar, admin.name, 'w-9 h-9 text-xs')}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {admin.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {admin.email}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 ml-2">
                      Super Admin
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Websites & Assigned Teams */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span>Websites &amp; Assigned Teams</span>
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleWebsites.map((site) => {
                // Find the Website Admin for this site
                const websiteAdmin = users.find((u) => 
                  u.roleAssignments[site.id] === 'Website Admin'
                );

                // Find all team members assigned under this site (excluding Super Admins & the Website Admin)
                const teamMembers = users.filter((u) => 
                  u.roleAssignments[site.id] && 
                  u.roleAssignments[site.id] !== 'Website Admin' &&
                  !Object.values(u.roleAssignments).includes('Super Admin')
                );

                return (
                  <div 
                    key={site.id}
                    className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    {/* Tenant Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-indigo-500" />
                          <span>{site.domain}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Active
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {site.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {site.description}
                      </p>
                    </div>

                    {/* Website Admin (Lead Tier) */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-indigo-50/20 dark:bg-indigo-950/10">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center justify-between">
                        <span>Website Administrator</span>
                        <Shield className="w-3 h-3" />
                      </div>

                      {websiteAdmin ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderUserAvatar(websiteAdmin.avatar, websiteAdmin.name, 'w-9 h-9 text-xs')}
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {websiteAdmin.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                {websiteAdmin.email}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setInspectingWebsite(site)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/80 shrink-0 ml-2"
                            title="Inspect & Manage Team"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                          No Website Admin assigned yet
                        </div>
                      )}
                    </div>

                    {/* Delegated Team Roster Under This Website Admin */}
                    <div className="p-4 flex-1 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Assigned Team ({teamMembers.length})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Managed by {websiteAdmin ? websiteAdmin.name.split(' ')[0] : 'Admin'}
                        </span>
                      </div>

                      {teamMembers.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                          No editorial members assigned yet.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {teamMembers.map((member) => {
                            const memberRole = member.roleAssignments[site.id];
                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {renderUserAvatar(member.avatar, member.name, 'w-7 h-7 text-[10px]')}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 dark:text-white truncate text-[11px]">
                                      {member.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">
                                      {member.email}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <div className="text-right">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getRoleBadge(memberRole)}`}>
                                      {memberRole}
                                    </span>
                                    {memberRole === 'Role Admin' && member.managedRoles && member.managedRoles.length > 0 && (
                                      <div className="text-[9px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                        Manages: {member.managedRoles.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                  {canManageUsers(activeRole) && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setShareModalData({
                                            user: member,
                                            website: site,
                                            tempPassword: member.tempPassword || '',
                                          });
                                        }}
                                        className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                        title="Share Credentials via WhatsApp / Email"
                                      >
                                        <Share2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenEdit(member, site.id)}
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                        title="Edit Member Role"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                      <button
                        onClick={() => setInspectingWebsite(site)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Manage Delegated Team</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {canManageUsers(activeRole) && (
                        <button
                          onClick={() => {
                            setInviteWebsiteId(site.id);
                            setInviteRole('Content Writer');
                            setIsInviteOpen(true);
                          }}
                          className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Add to {site.name.split(' ')[0]}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: 📋 ALL MEMBERS (STREAMLINED ROSTER DIRECTORY)                  */}
      {/* ===================================================================== */}
      {activeTab === 'directory' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Member Directory
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {filteredUsers.length} total members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Team Member</th>
                  <th className="py-3 px-4 font-semibold">Role Assignments</th>
                  <th className="py-3 px-4 font-semibold">Delegation / Reporting</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isLoadingUsers ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-850 rounded w-32" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-28" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-14" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No members match your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const assignedTenants = Object.entries(u.roleAssignments);
                    const isGlobalSuper = Object.values(u.roleAssignments).includes('Super Admin');
                    const isAnyWebsiteAdmin = Object.values(u.roleAssignments).includes('Website Admin');

                    // Determine delegation line
                    let delegationText = 'Super Admin (Global)';
                    if (!isGlobalSuper) {
                      if (isAnyWebsiteAdmin) {
                        delegationText = 'Website Admin (Tenant Lead)';
                      } else {
                        const siteId = assignedTenants[0]?.[0];
                        const siteLead = users.find(lead => lead.roleAssignments[siteId] === 'Website Admin');
                        delegationText = siteLead ? `Managed by ${siteLead.name}` : 'Direct Contributor';
                      }
                    }

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {renderUserAvatar(u.avatar, u.name, 'w-8 h-8 text-xs')}
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {assignedTenants.map(([siteId, role]) => {
                              const site = websites.find((w) => w.id === siteId);
                              const siteName = siteId === 'all' ? 'All Sites' : (site?.name || siteId);
                              const isRoleAdmin = role === 'Role Admin';
                              const defaultMods = getDefaultRoleModules(role);
                              const customUnlocked = u.customModules?.filter((m) => !defaultMods.includes(m)) || [];
                              return (
                                <div key={siteId} className="flex flex-col items-start gap-0.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadge(role)}`}
                                  >
                                    <span className="font-normal opacity-80">{siteName}:</span>
                                    <span>{role}</span>
                                  </span>
                                  {isRoleAdmin && u.managedRoles && u.managedRoles.length > 0 && (
                                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium pl-0.5">
                                      Manages: {u.managedRoles.join(', ')}
                                    </span>
                                  )}
                                  {customUnlocked.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 pl-0.5" title={`Unlocked: ${customUnlocked.join(', ')}`}>
                                      <Unlock className="w-2.5 h-2.5" />
                                      <span>+{customUnlocked.length} unlocked ({customUnlocked.join(', ')})</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{delegationText}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {(() => {
                            const targetIsSuperAdmin = Object.values(u.roleAssignments || {}).includes('Super Admin');
                            const canManageThisUser = canManageUsers(activeRole) && (isSuperAdmin || !targetIsSuperAdmin);

                            if (canManageThisUser) {
                              return (
                                <button
                                  onClick={() => {
                                    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
                                    updateUser(u.id, { status: nextStatus });
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold cursor-pointer border text-[11px] transition-colors ${
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
                              );
                            }

                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold border text-[11px] ${
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
                              </span>
                            );
                          })()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(() => {
                              const targetIsSuperAdmin = Object.values(u.roleAssignments || {}).includes('Super Admin');
                              const canManageThisUser = canManageUsers(activeRole) && (isSuperAdmin || !targetIsSuperAdmin);

                              if (!canManageThisUser) {
                                return (
                                  <span className="text-[11px] text-slate-400 italic">Protected</span>
                                );
                              }

                              return (
                                <>
                                  <button
                                    onClick={() => {
                                      const primarySiteId = Object.keys(u.roleAssignments)[0];
                                      const site = websites.find((w) => w.id === primarySiteId) || websites[0];
                                      setShareModalData({
                                        user: u,
                                        website: site,
                                        tempPassword: u.tempPassword || '',
                                      });
                                    }}
                                    title="Share Credentials (Email / WhatsApp)"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800/60"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenEdit(u)}
                                    title="Edit Role Assignment"
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    disabled={deletingUserId === u.id}
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    title="Revoke Member"
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800/60 disabled:opacity-50"
                                  >
                                    <Trash2 className={`w-3.5 h-3.5 ${deletingUserId === u.id ? 'animate-spin' : ''}`} />
                                  </button>
                                </>
                              );
                            })()}
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

      {/* ===================================================================== */}
      {/* TAB 3: 🛡️ RBAC ENTITLEMENT MATRIX                                     */}
      {/* ===================================================================== */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-500" />
              Role-Based Access Control (RBAC) Entitlement Matrix
            </h3>
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

      {/* ===================================================================== */}
      {/* MODAL: INSPECT WEBSITE ADMIN DELEGATED TEAM                           */}
      {/* ===================================================================== */}
      {inspectingWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {inspectingWebsite.name} — Team Members
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {inspectingWebsite.domain}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingWebsite(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Lead Administrator Card */}
            {(() => {
              const leadAdmin = users.find((u) => u.roleAssignments[inspectingWebsite.id] === 'Website Admin');
              return (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {renderUserAvatar(leadAdmin?.avatar, leadAdmin?.name || 'Lead Admin', 'w-10 h-10 text-sm')}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        Website Administrator
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {leadAdmin ? leadAdmin.name : 'No Website Admin Assigned'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {leadAdmin ? leadAdmin.email : 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                    Website Admin
                  </span>
                </div>
              );
            })()}

            {/* Subordinate Team Members List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  Assigned Team Members
                </span>
                {canManageUsers(activeRole) && (
                  <button
                    onClick={() => {
                      setInviteWebsiteId(inspectingWebsite.id);
                      setInviteRole('Content Writer');
                      setInspectingWebsite(null);
                      setIsInviteOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Invite Member to {inspectingWebsite.name.split(' ')[0]}</span>
                  </button>
                )}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-60 overflow-y-auto">
                {users.filter(u => u.roleAssignments[inspectingWebsite.id] && u.roleAssignments[inspectingWebsite.id] !== 'Website Admin').length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No members assigned to this website yet.
                  </div>
                ) : (
                  users
                    .filter(u => u.roleAssignments[inspectingWebsite.id] && u.roleAssignments[inspectingWebsite.id] !== 'Website Admin')
                    .map(member => (
                      <div key={member.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-xs">
                        <div className="flex items-center gap-3">
                          {renderUserAvatar(member.avatar, member.name, 'w-8 h-8 text-xs')}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{member.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{member.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md border ${getRoleBadge(member.roleAssignments[inspectingWebsite.id])}`}>
                              {member.roleAssignments[inspectingWebsite.id]}
                            </span>
                            {member.roleAssignments[inspectingWebsite.id] === 'Role Admin' && member.managedRoles && member.managedRoles.length > 0 && (
                              <div className="text-[9px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                Manages: {member.managedRoles.join(', ')}
                              </div>
                            )}
                          </div>
                          {canManageUsers(activeRole) && (
                            <>
                              <button
                                onClick={() => {
                                  setShareModalData({
                                    user: member,
                                    website: inspectingWebsite,
                                    tempPassword: member.tempPassword || '',
                                  });
                                }}
                                className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                title="Share Credentials via WhatsApp / Email"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setInspectingWebsite(null);
                                  handleOpenEdit(member, inspectingWebsite.id);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Edit Member Role"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingWebsite(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-200"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: INVITE MEMBER                                                  */}
      {/* ===================================================================== */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-[#0f172a]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Invite Organization Member
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure member account, tenant scope, and custom module access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="invite-user-form" onSubmit={handleInviteSubmit} className="flex-1 overflow-y-auto p-6 space-y-4.5 custom-scrollbar text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tenant Assignment Scope
                  </label>
                  <select
                    value={inviteWebsiteId}
                    onChange={(e) => setInviteWebsiteId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {isSuperAdmin && (
                      <option value="all">All Websites (Network Wide)</option>
                    )}
                    {visibleWebsites.map((w) => (
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
                    onChange={(e) => handleInviteRoleChange(e.target.value as UserRole)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {allowedRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plugin & Module Capabilities with Super Admin Granular Unlock */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Modular Permissions &amp; Feature Access for &ldquo;{inviteRole}&rdquo;</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Super Admin can click any locked module below to unlock custom access.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {inviteCustomModules.length} of {PLUGIN_MODULES.length} Active
                    </span>
                    <button
                      type="button"
                      onClick={resetInviteModulesToDefault}
                      className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer transition-colors"
                      title="Reset modules to role defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Defaults</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {PLUGIN_MODULES.map((mod) => {
                    const isRoleDefault = getDefaultRoleModules(inviteRole).includes(mod.id);
                    const isCurrentlyAllowed = inviteCustomModules.includes(mod.id);
                    const isCustomUnlocked = isCurrentlyAllowed && !isRoleDefault;
                    const ModIcon = mod.icon;

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleInviteModule(mod.id)}
                        className={`group flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrentlyAllowed
                            ? isCustomUnlocked
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/80 text-slate-900 dark:text-white shadow-2xs hover:border-indigo-400'
                              : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800/80 text-slate-900 dark:text-white shadow-2xs hover:border-emerald-400'
                            : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${
                          isCurrentlyAllowed
                            ? isCustomUnlocked
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <ModIcon className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-xs leading-snug truncate">
                              {mod.name}
                            </span>
                            {isCurrentlyAllowed ? (
                              isCustomUnlocked ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider shrink-0">
                                  <Unlock className="w-2.5 h-2.5" />
                                  <span>Unlocked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider shrink-0">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Active</span>
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/80 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Locked</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-1">
                            {mod.desc}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold">
                            {isCurrentlyAllowed ? (
                              isCustomUnlocked ? (
                                <span className="text-indigo-600 dark:text-indigo-400">✨ Custom Unlocked</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">Role Default</span>
                              )
                            ) : (
                              <span className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                Click to unlock
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role Admin Managed Roles Scope */}
              {inviteRole === 'Role Admin' && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-blue-950 dark:text-blue-200 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Role Admin Managed Scope (Administer Which Roles?)</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {inviteManagedRoles.length} selected
                    </span>
                  </div>

                  {/* Preset Shortcuts */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setInviteManagedRoles(['Editor', 'Content Writer'])}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        inviteManagedRoles.length === 2 && inviteManagedRoles.includes('Editor') && inviteManagedRoles.includes('Content Writer')
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                      }`}
                    >
                      Editorial &amp; Writing
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteManagedRoles(['Content Writer'])}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        inviteManagedRoles.length === 1 && inviteManagedRoles.includes('Content Writer')
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                      }`}
                    >
                      Writers Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteManagedRoles(['Editor', 'Content Writer', 'SEO Manager', 'Publisher'])}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        inviteManagedRoles.length === 4
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                      }`}
                    >
                      All Contributor Roles
                    </button>
                  </div>

                  {/* Checkbox Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {DELEGATABLE_ROLES.map(({ role, label }) => {
                      const isChecked = inviteManagedRoles.includes(role);
                      return (
                        <label
                          key={role}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-white dark:bg-slate-900 border-blue-400 dark:border-blue-700 text-slate-900 dark:text-white font-medium shadow-2xs'
                              : 'bg-transparent border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-white/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (inviteManagedRoles.length > 1) {
                                  setInviteManagedRoles(inviteManagedRoles.filter((r) => r !== role));
                                }
                              } else {
                                setInviteManagedRoles([...inviteManagedRoles, role]);
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Access Credentials & Temporary Password */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Temporary Password &amp; Login ID</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setInvitePassword(generateStrongPassword())}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showInvitePassword ? 'text' : 'password'}
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    required
                    placeholder="Initial Temporary Password"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-20 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowInvitePassword(!showInvitePassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showInvitePassword ? 'Hide password' : 'Show password'}
                    >
                      {showInvitePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(invitePassword);
                        showNotification('Password copied to clipboard', 'info');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Copy password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  User Login ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{inviteEmail || 'user@company.com'}</strong>
                </div>
              </div>
            </form>

            {/* Sticky Fixed Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="invite-user-form"
                disabled={isSubmittingInvite}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSubmittingInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSubmittingInvite ? 'Creating...' : 'Create & Generate Invitation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT USER ROLE & SCOPE                                         */}
      {/* ===================================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-[#0f172a]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Role &amp; Module Access
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update tenant delegation and custom module permissions for {editingUser.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="edit-user-form" onSubmit={handleSaveUserEdit} className="flex-1 overflow-y-auto p-6 space-y-4.5 custom-scrollbar text-xs">
              {/* Member Card Snapshot */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                {renderUserAvatar(editingUser.avatar, editingUser.name, 'w-10 h-10 text-sm')}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                    {editingUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {editingUser.email}
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  editingUser.status === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                }`}>
                  {editingUser.status}
                </span>
              </div>

              {/* Tenant Scope & Assigned Role (2-column grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        const newRole = (editingUser.roleAssignments[newWebId] || editingUser.roleAssignments['all'] || allowedRoles[0] || 'Content Writer') as UserRole;
                        setEditRole(newRole);
                        setEditCustomModules(
                          editingUser.customModules && editingUser.customModules.length > 0
                            ? [...editingUser.customModules]
                            : getDefaultRoleModules(newRole)
                        );
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {isSuperAdmin && (
                      <option value="all">All Websites (Network Wide)</option>
                    )}
                    {visibleWebsites.map((w) => (
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
                    onChange={(e) => handleEditRoleChange(e.target.value as UserRole)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {allowedRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plugin & Module Capabilities with Super Admin Granular Unlock */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Modular Permissions &amp; Feature Access for &ldquo;{editRole}&rdquo;</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Super Admin can click any locked module below to unlock custom access.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {editCustomModules.length} of {PLUGIN_MODULES.length} Active
                    </span>
                    <button
                      type="button"
                      onClick={resetEditModulesToDefault}
                      className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer transition-colors"
                      title="Reset modules to role defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Defaults</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {PLUGIN_MODULES.map((mod) => {
                    const isRoleDefault = getDefaultRoleModules(editRole).includes(mod.id);
                    const isCurrentlyAllowed = editCustomModules.includes(mod.id);
                    const isCustomUnlocked = isCurrentlyAllowed && !isRoleDefault;
                    const ModIcon = mod.icon;

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleEditModule(mod.id)}
                        className={`group flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrentlyAllowed
                            ? isCustomUnlocked
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/80 text-slate-900 dark:text-white shadow-2xs hover:border-indigo-400'
                              : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800/80 text-slate-900 dark:text-white shadow-2xs hover:border-emerald-400'
                            : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${
                          isCurrentlyAllowed
                            ? isCustomUnlocked
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <ModIcon className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-xs leading-snug truncate">
                              {mod.name}
                            </span>
                            {isCurrentlyAllowed ? (
                              isCustomUnlocked ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider shrink-0">
                                  <Unlock className="w-2.5 h-2.5" />
                                  <span>Unlocked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider shrink-0">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Active</span>
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/80 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Locked</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-1">
                            {mod.desc}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold">
                            {isCurrentlyAllowed ? (
                              isCustomUnlocked ? (
                                <span className="text-indigo-600 dark:text-indigo-400">✨ Custom Unlocked</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">Role Default</span>
                              )
                            ) : (
                              <span className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                Click to unlock
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role Admin Managed Roles Scope in Edit Modal */}
              {editRole === 'Role Admin' && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-blue-950 dark:text-blue-200 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Role Admin Managed Scope (Administer Which Roles?)</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {editManagedRoles.length} selected
                    </span>
                  </div>

                  {/* Preset Shortcuts */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditManagedRoles(['Editor', 'Content Writer'])}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        editManagedRoles.length === 2 && editManagedRoles.includes('Editor') && editManagedRoles.includes('Content Writer')
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                      }`}
                    >
                      Editorial &amp; Writing
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditManagedRoles(['Content Writer'])}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        editManagedRoles.length === 1 && editManagedRoles.includes('Content Writer')
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                      }`}
                    >
                      Writers Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditManagedRoles(['Editor', 'Content Writer', 'SEO Manager', 'Publisher'])}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        editManagedRoles.length === 4
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                      }`}
                    >
                      All Contributor Roles
                    </button>
                  </div>

                  {/* Checkbox Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {DELEGATABLE_ROLES.map(({ role, label }) => {
                      const isChecked = editManagedRoles.includes(role);
                      return (
                        <label
                          key={role}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-white dark:bg-slate-900 border-blue-400 dark:border-blue-700 text-slate-900 dark:text-white font-medium shadow-2xs'
                              : 'bg-transparent border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-white/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (editManagedRoles.length > 1) {
                                  setEditManagedRoles(editManagedRoles.filter((r) => r !== role));
                                }
                              } else {
                                setEditManagedRoles([...editManagedRoles, role]);
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Status */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
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
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
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
            </form>

            {/* Sticky Fixed Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-user-form"
                disabled={isSavingUserEdit}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 ${
                  isSavingUserEdit
                    ? 'bg-red-400 cursor-not-allowed opacity-80'
                    : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                }`}
              >
                {isSavingUserEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SHARE CREDENTIALS (WHATSAPP / EMAIL / COPY)                   */}
      {/* ===================================================================== */}
      {shareModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Credentials &amp; Onboarding Invitation
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Share login details directly with {shareModalData.user.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShareModalData(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Assigned Website:</span>
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  {shareModalData.website?.name || 'Jupsoft Cloud & ERP'} ({shareModalData.website?.domain || 'cloud.jupsoft.com'})
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Assigned Role:</span>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getRoleBadge(
                    (shareModalData.user.roleAssignments[shareModalData.website?.id || ''] || shareModalData.user.roleAssignments['all'] || 'Editor') as UserRole
                  )}`}>
                    {shareModalData.user.roleAssignments[shareModalData.website?.id || ''] || shareModalData.user.roleAssignments['all']}
                  </span>
                  {shareModalData.user.managedRoles && shareModalData.user.managedRoles.length > 0 && (
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                      Manages: {shareModalData.user.managedRoles.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Login URL:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">
                  {typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://cloud.jupsoft.com/login'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Login ID / Email:</span>
                <span className="font-mono text-slate-900 dark:text-white font-semibold">
                  {shareModalData.user.email}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Temporary Password:</span>
                {(shareModalData.tempPassword || shareModalData.user.tempPassword) ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-900 dark:text-white font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      {showSharePassword ? (shareModalData.tempPassword || shareModalData.user.tempPassword) : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSharePassword(!showSharePassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showSharePassword ? 'Hide password' : 'Show password'}
                    >
                      {showSharePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = shareModalData.tempPassword || shareModalData.user.tempPassword || '';
                        navigator.clipboard.writeText(pwd);
                        showNotification('Password copied to clipboard', 'info');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Copy password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetUserPassword(shareModalData.user.id)}
                      disabled={isResettingPassword}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer disabled:opacity-50"
                      title="Regenerate new temporary password"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResettingPassword ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResetUserPassword(shareModalData.user.id)}
                    disabled={isResettingPassword}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isResettingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>Generate Password</span>
                  </button>
                )}
              </div>
            </div>

            {/* Share Actions */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Quick Dispatch Options:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* WhatsApp Button */}
                <button
                  type="button"
                  disabled={!shareModalData.tempPassword && !shareModalData.user.tempPassword}
                  onClick={() => handleShareWhatsApp(shareModalData.user, shareModalData.website, shareModalData.tempPassword || shareModalData.user.tempPassword)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>Share via WhatsApp</span>
                </button>

                {/* Email Button */}
                <button
                  type="button"
                  disabled={!shareModalData.tempPassword && !shareModalData.user.tempPassword}
                  onClick={() => handleShareEmail(shareModalData.user, shareModalData.website, shareModalData.tempPassword || shareModalData.user.tempPassword)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  <span>Share via Email</span>
                </button>
              </div>

              {/* Copy Text Button */}
              <button
                type="button"
                disabled={!shareModalData.tempPassword && !shareModalData.user.tempPassword}
                onClick={() => handleCopyInvite(shareModalData.user, shareModalData.website, shareModalData.tempPassword || shareModalData.user.tempPassword)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Invitation Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Invitation Message</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShareModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs cursor-pointer shadow-xs"
              >
                Done &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
