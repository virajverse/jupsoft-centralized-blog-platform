'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { apiClient } from '../../services/apiClient';
import { SupportTicket, TicketStatus, TicketPriority } from '../../types';
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Flame, 
  Globe, 
  User, 
  Mail, 
  ExternalLink, 
  Image as ImageIcon, 
  X, 
  ChevronRight, 
  Check, 
  Trash2, 
  Loader2, 
  ArrowUpRight,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { UserSupportView } from './UserSupportView';

const SuperAdminSupportView: React.FC = () => {
  const { websites, activeWebsiteId, setActiveWebsite } = useBlogStore();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Filters
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer update state
  const [updatingStatus, setUpdatingStatus] = useState<TicketStatus>('OPEN');
  const [updatingPriority, setUpdatingPriority] = useState<TicketPriority>('MEDIUM');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Zoom screenshot lightbox
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [ticketsRes, statsRes] = await Promise.all([
        apiClient.getSupportTickets({
          websiteId: selectedWebsite,
          status: statusFilter,
          search: searchQuery,
          limit: 100,
        }),
        apiClient.getSupportStats(selectedWebsite),
      ]);

      setTickets(ticketsRes.data || []);
      setStats(statsRes || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedWebsite, statusFilter, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSelectTicket = (t: SupportTicket) => {
    setSelectedTicket(t);
    setUpdatingStatus(t.status);
    setUpdatingPriority(t.priority);
    setAdminNotes(t.adminNotes || '');
    setActionSuccess('');
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setIsSaving(true);
    setActionSuccess('');

    try {
      const updated = await apiClient.updateSupportTicket(selectedTicket.id, {
        status: updatingStatus,
        priority: updatingPriority,
        adminNotes,
      });

      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setActionSuccess('Ticket updated successfully!');

      // Refresh stats
      const newStats = await apiClient.getSupportStats(selectedWebsite);
      setStats(newStats);
    } catch (err: any) {
      alert(`Error updating ticket: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this support ticket?')) return;

    setIsDeletingTicket(true);
    try {
      await apiClient.deleteSupportTicket(id);
      setSelectedTicket(null);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      const newStats = await apiClient.getSupportStats(selectedWebsite);
      setStats(newStats);
    } catch (err: any) {
      alert(`Failed to delete ticket: ${err.message}`);
    } finally {
      setIsDeletingTicket(false);
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <Flame className="w-3 h-3 text-rose-500 animate-pulse" />
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#070a12] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Central Support Pool &amp; Issue Desk</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                  Super Admin Exclusive
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized multi-tenant error reports, writer complaints, and visual screenshot diagnostics.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchTickets(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer w-fit"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-500' : ''}`} />
          <span>Refresh Pool</span>
        </button>
      </div>

      {/* 2. Top Stats Counter Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl bg-white dark:bg-[#0e1628] border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'all' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Complaints</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Across all websites</div>
        </div>

        <div 
          onClick={() => setStatusFilter('OPEN')}
          className={`p-4 rounded-2xl bg-white dark:bg-[#0e1628] border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'OPEN' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>Pending / Open</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{stats.open}</div>
          <div className="text-[10px] text-slate-400 mt-1">Requires your attention</div>
        </div>

        <div 
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`p-4 rounded-2xl bg-white dark:bg-[#0e1628] border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'IN_PROGRESS' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            In Progress
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.inProgress}</div>
          <div className="text-[10px] text-slate-400 mt-1">Being actively resolved</div>
        </div>

        <div 
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-4 rounded-2xl bg-white dark:bg-[#0e1628] border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'RESOLVED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Resolved
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.resolved}</div>
          <div className="text-[10px] text-slate-400 mt-1">Successfully fixed</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, reporter, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-9 pr-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Website / Tenant Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedWebsite}
              onChange={(e) => setSelectedWebsite(e.target.value)}
              className="text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
            >
              <option value="all">All Websites (Tenant Pool)</option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* 4. Tickets Table */}
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <span className="text-xs text-slate-400 font-medium">Loading Central Support Pool...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Support Tickets Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All complaints are cleared! New complaints submitted from the Help Center will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#101728] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket #</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Subject &amp; Issue</th>
                  <th className="py-3 px-4 text-center">Screenshot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors cursor-pointer group"
                  >
                    {/* Ticket # & Priority */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400">
                        #{t.ticketNumber}
                      </div>
                      <div className="mt-0.5">{getPriorityBadge(t.priority)}</div>
                    </td>

                    {/* Website */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                        <Globe className="w-3 h-3 text-red-500" />
                        <span>{t.website?.name || t.websiteId}</span>
                      </span>
                    </td>

                    {/* Reporter */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-900 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.userName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{t.userEmail}</div>
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t.description}
                      </div>
                    </td>

                    {/* Screenshot Thumbnail */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {t.screenshotUrl ? (
                        <div className="relative inline-block group/thumb">
                          <img
                            src={t.screenshotUrl}
                            alt="Screenshot"
                            className="w-10 h-7 object-cover rounded border border-slate-300 dark:border-slate-700 mx-auto shadow-2xs hover:scale-110 transition-transform"
                          />
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No image</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(t.status)}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTicket(t);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-600 dark:hover:text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Slide-Over Detail Drawer */}
      {selectedTicket && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-[#0c1220] h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#11192d] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
                  #{selectedTicket.ticketNumber}
                </span>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedTicket.website?.name || selectedTicket.websiteId}
                </span>
                {getPriorityBadge(selectedTicket.priority)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Subject */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Subject</div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedTicket.subject}
                </h3>
              </div>

              {/* Reporter Info Card */}
              <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Reporter</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedTicket.userName}</span>
                  <span className="text-slate-500 block text-[10px]">{selectedTicket.userEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Role / Tenant</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedTicket.userRole}</span>
                  <span className="text-slate-500 block text-[10px]">{selectedTicket.website?.name}</span>
                </div>
                {selectedTicket.pageUrl && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-800 font-mono text-[10px]">
                    <span className="text-slate-400">Route where error occurred: </span>
                    <span className="text-indigo-600 dark:text-indigo-400">{selectedTicket.pageUrl}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  User Description &amp; Complaint
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Screenshot Preview */}
              {selectedTicket.screenshotUrl && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-red-500" />
                      <span>Attached Screenshot</span>
                    </div>
                    <a
                      href={selectedTicket.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open Original</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div 
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-zoom-in group shadow-xs bg-slate-950"
                  >
                    <img
                      src={selectedTicket.screenshotUrl}
                      alt="Error Screenshot"
                      className="w-full max-h-64 object-contain mx-auto transition-transform group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                      <ExternalLink className="w-4 h-4" />
                      <span>Click to view full size</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Resolution Controls */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101728] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Update Resolution &amp; Admin Notes</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Status
                    </label>
                    <select
                      value={updatingStatus}
                      onChange={(e) => setUpdatingStatus(e.target.value as any)}
                      className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                    >
                      <option value="OPEN">Open (Pending)</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved (Fixed)</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Priority
                    </label>
                    <select
                      value={updatingPriority}
                      onChange={(e) => setUpdatingPriority(e.target.value as any)}
                      className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Super Admin Resolution Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. S3 policy updated, credentials synced, issue verified resolved."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-red-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    disabled={isDeletingTicket}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{isDeletingTicket ? 'Deleting Ticket...' : 'Delete Ticket'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdateTicket}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Lightbox Full-Screen Screenshot Viewer */}
      {isLightboxOpen && selectedTicket?.screenshotUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span>Close Lightbox</span>
            </button>
            <img
              src={selectedTicket.screenshotUrl}
              alt="Full Resolution Screenshot"
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const SupportTicketsView: React.FC = () => {
  const { activeRole } = useBlogStore();

  if (activeRole && activeRole !== 'Super Admin') {
    return <UserSupportView />;
  }

  return <SuperAdminSupportView />;
};
