'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { apiClient } from '../../services/apiClient';
import { SupportTicket, TicketStatus, TicketPriority } from '../../types';
import { 
  X, 
  UploadCloud, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  Loader2, 
  Trash2,
  Clock,
  ExternalLink,
  MessageSquare,
  Check,
  RotateCcw,
  Camera
} from 'lucide-react';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject?: string;
  defaultDescription?: string;
}

const CATEGORIES = [
  'Image / Media Upload Issue',
  'Blog Editor / Content Formatting',
  'Publishing & Scheduling Error',
  'Permissions / Access Denied (403)',
  'Authentication / Login / Password',
  'Slow Loading / Timeout (504)',
  'General Bug / Feedback',
];

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  defaultSubject = '',
  defaultDescription = '',
}) => {
  const pathname = usePathname();
  const { activeWebsiteId, websites, currentUser } = useBlogStore();

  // Tab: 'create' for new report, 'track' for tracking existing tickets
  const [activeTab, setActiveTab] = useState<'create' | 'track'>('create');

  // Create Ticket State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState(defaultSubject);
  const [description, setDescription] = useState(defaultDescription);
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; ticketNumber: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Track Tickets State
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loadingMyTickets, setLoadingMyTickets] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync defaults
  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
    if (defaultDescription) setDescription(defaultDescription);
  }, [defaultSubject, defaultDescription]);

  // Fetch user's tickets when modal opens or tab switches
  const loadMyTickets = async () => {
    setLoadingMyTickets(true);
    try {
      const tickets = await apiClient.getMySupportTickets();
      setMyTickets(tickets || []);
    } catch (err) {
      console.error('Failed to load my tickets:', err);
    } finally {
      setLoadingMyTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMyTickets();
    }
  }, [isOpen]);

  // Handle Ctrl+V paste anywhere inside modal
  useEffect(() => {
    if (!isOpen || activeTab !== 'create') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            setScreenshotFile(file);
            const previewUrl = URL.createObjectURL(file);
            setScreenshotPreview(previewUrl);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, activeTab]);

  // Clean up blob preview on unmount
  useEffect(() => {
    return () => {
      if (screenshotPreview && screenshotPreview.startsWith('blob:')) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  if (!isOpen) return null;

  const currentWebsiteName = websites.find((w) => w.id === activeWebsiteId)?.name || 'Central Platform';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
        return;
      }
      setScreenshotFile(file);
      const previewUrl = URL.createObjectURL(file);
      setScreenshotPreview(previewUrl);
      setErrorMsg('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshotFile(file);
      const previewUrl = URL.createObjectURL(file);
      setScreenshotPreview(previewUrl);
      setErrorMsg('');
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview && screenshotPreview.startsWith('blob:')) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMsg('Please enter a short subject for the issue.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe the problem or error you are facing.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('subject', `[${category}] ${subject.trim()}`);
      formData.append('description', description.trim());
      const effectiveSiteId = (activeWebsiteId && activeWebsiteId !== 'all') ? activeWebsiteId : (websites[0]?.id || '');
      formData.append('websiteId', effectiveSiteId);
      formData.append('pageUrl', pathname || window.location.pathname);
      formData.append('priority', priority);

      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const res = await apiClient.createSupportTicket(formData);
      setSubmittedTicket({ id: res.id, ticketNumber: res.ticketNumber });
      loadMyTickets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubject('');
    setDescription('');
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setSubmittedTicket(null);
    setErrorMsg('');
    setActiveTab('create');
    onClose();
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            Open (Pending)
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Resolved (Fixed)
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#11192d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shadow-2xs">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Support &amp; Issue Desk</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                  Real Person
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Report a bug or track previously raised tickets directly with Super Admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 px-5 pt-1.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Raise New Issue</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('track');
              loadMyTickets();
            }}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'track'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Track My Tickets</span>
            {myTickets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold">
                {myTickets.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: CREATE TICKET VIEW */}
        {activeTab === 'create' && (
          <>
            {submittedTicket ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-800 shadow-sm animate-in zoom-in-75">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Ticket Submitted Successfully!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Your complaint has been queued in the Central Support Pool under ticket ID{' '}
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      #{submittedTicket.ticketNumber}
                    </span>.
                    The Super Admin has received your request and screenshot.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedTicket(null);
                      setActiveTab('track');
                      loadMyTickets();
                    }}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Track This Ticket</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Context Auto-Captured Pills */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1 font-medium">
                    <span className="text-slate-400">Website:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{currentWebsiteName}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <div className="flex items-center gap-1 font-medium">
                    <span className="text-slate-400">Reporter:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{currentUser?.name || 'User'}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span className="text-slate-400">Route:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">{pathname}</span>
                  </div>
                </div>

                {/* Category & Priority Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Issue Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Urgency / Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="LOW">Low (Minor visual / question)</option>
                      <option value="MEDIUM">Medium (Work is slowed down)</option>
                      <option value="HIGH">High (Important feature blocked)</option>
                      <option value="URGENT">Urgent (Portal critical bug / cannot work)</option>
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Summary <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Uploading WebP image gives XML Access Denied error"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description &amp; Steps to Reproduce <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Explain what happened, what button you clicked, or any error message that popped up on your screen..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                  />
                </div>

                {/* Screenshot Upload / Paste Zone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                      <span>Attach Screenshot (WebP Optimized)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Ctrl + V</kbd> to paste
                    </span>
                  </div>

                  {screenshotPreview ? (
                    <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={screenshotPreview}
                          alt="Screenshot preview"
                          className="w-16 h-12 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {screenshotFile?.name || 'Pasted-screenshot.png'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {screenshotFile ? `${(screenshotFile.size / 1024).toFixed(0)} KB (Auto converts to WebP)` : 'Image attached'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Remove screenshot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-1.5 group"
                    >
                      <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors" />
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Click to browse, drag image here, or press <span className="text-red-600 dark:text-red-400">Ctrl + V</span> to paste
                      </div>
                      <div className="text-[10px] text-slate-400">
                        PNG, JPG, WebP supported (auto WebP compression)
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!subject.trim() || !description.trim() || isSubmitting}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    title={!subject.trim() || !description.trim() ? 'Please provide both subject and description' : 'Send complaint to Super Admin'}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending to Super Admin...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Complaint</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* TAB 2: TRACK MY TICKETS VIEW */}
        {activeTab === 'track' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tickets raised by you across all websites:
              </div>
              <button
                type="button"
                onClick={loadMyTickets}
                disabled={loadingMyTickets}
                className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${loadingMyTickets ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingMyTickets ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                <span className="text-xs text-slate-400">Loading your tickets...</span>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="p-8 text-center space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No tickets raised yet
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  When you report an error or issue, you can track the Super Admin resolution status here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="mt-2 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                >
                  Raise an Issue Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5 shadow-2xs"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                            #{ticket.ticketNumber}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ticket.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {ticket.subject}
                        </h5>
                      </div>
                      <div>{getStatusBadge(ticket.status)}</div>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-[#0c1220] p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                      {ticket.description}
                    </p>

                    {/* Attached Screenshot link if present */}
                    {ticket.screenshotUrl && (
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-slate-400" />
                          <span>Screenshot attached</span>
                        </span>
                        <a
                          href={ticket.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          <span>View Image</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    {/* Super Admin Resolution Note if provided */}
                    {ticket.adminNotes && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[11px] space-y-1">
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Super Admin Response / Resolution Remark:</span>
                        </div>
                        <div className="text-emerald-950 dark:text-emerald-100 font-medium pl-5 whitespace-pre-wrap">
                          {ticket.adminNotes}
                        </div>
                        {ticket.resolvedAt && (
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 pl-5">
                            Resolved on {new Date(ticket.resolvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
