'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { apiClient } from '../../services/apiClient';
import { SupportTicket, TicketStatus, TicketPriority } from '../../types';
import {
  LifeBuoy,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  Trash2,
  Clock,
  ExternalLink,
  Camera,
  UploadCloud,
  RotateCcw,
  Check,
  Globe,
  User,
  Sparkles
} from 'lucide-react';

const CATEGORIES = [
  'Image / Media Upload Issue',
  'Blog Editor / Content Formatting',
  'Publishing & Scheduling Error',
  'Permissions / Access Denied (403)',
  'Authentication / Login / Password',
  'Slow Loading / Timeout (504)',
  'General Bug / Feedback',
];

export const UserSupportView: React.FC = () => {
  const pathname = usePathname();
  const { activeWebsiteId, websites, currentUser } = useBlogStore();

  // Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // My Tickets State
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentWebsiteName = websites.find((w) => w.id === activeWebsiteId)?.name || 'My Website';

  // Fetch user's tickets
  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const tickets = await apiClient.getMySupportTickets();
      setMyTickets(tickets || []);
    } catch (err) {
      console.error('Failed to load my tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  // Handle Ctrl+V paste anywhere on the page
  useEffect(() => {
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
            setErrorMsg('');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Clean up blob preview on unmount
  useEffect(() => {
    return () => {
      if (screenshotPreview && screenshotPreview.startsWith('blob:')) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

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
      setErrorMsg('Please enter a short subject for the complaint.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe the issue or error you experienced.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

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
      setSuccessMsg(`Ticket #${res.ticketNumber} submitted! Super Admin has been notified.`);
      setSubject('');
      setDescription('');
      handleRemoveScreenshot();
      fetchMyTickets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            Open (Pending)
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
            Resolved (Fixed)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Support &amp; Issue Desk</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                Direct Line to Super Admin
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Facing an error, image upload problem, or permission block? Report it with a screenshot and track live status here.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchMyTickets}
          disabled={loadingTickets}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer w-fit"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin text-red-500' : ''}`} />
          <span>Refresh My Tickets</span>
        </button>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Complaint Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Submit an Error / Complaint
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Goes directly to Super Admin
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auto Context Banner */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1 font-medium">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Website:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{currentWebsiteName}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <div className="flex items-center gap-1 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Reporter:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{currentUser?.name || 'User'}</span>
              </div>
            </div>

            {/* Category & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
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
                  className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                >
                  <option value="LOW">Low (Minor visual / question)</option>
                  <option value="MEDIUM">Medium (Work is slowed down)</option>
                  <option value="HIGH">High (Important feature blocked)</option>
                  <option value="URGENT">Urgent (Portal critical / cannot work)</option>
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
                placeholder="e.g. Image upload throws XML AccessDenied error"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description &amp; Error Details <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Explain what happened, what button you clicked, or paste the error text..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
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
                  Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Ctrl + V</kbd> to paste
                </span>
              </div>

              {screenshotPreview ? (
                <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 p-2.5 flex items-center justify-between">
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
                  className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 p-5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-1.5 group"
                >
                  <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors" />
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to browse, drag image here, or press <span className="text-red-600 dark:text-red-400">Ctrl + V</span> to paste
                  </div>
                  <div className="text-[10px] text-slate-400">
                    PNG, JPG, WebP supported (auto converts to WebP for fast upload)
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

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Complaint to Super Admin...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Complaint</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Track My Tickets (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                My Submitted Tickets
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {myTickets.length} Total
            </span>
          </div>

          {loadingTickets ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-xs text-slate-400">Loading your tickets...</span>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="p-8 text-center space-y-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <Clock className="w-8 h-8 mx-auto" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No tickets submitted yet
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Fill the form on the left to report any error. You will be able to track Super Admin responses right here.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[680px] overflow-y-auto pr-1">
              {myTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5 shadow-2xs"
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                          #{t.ticketNumber}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {t.subject}
                      </h4>
                    </div>
                    <div>{getStatusBadge(t.status)}</div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-[#0c1220] p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 whitespace-pre-wrap">
                    {t.description}
                  </p>

                  {/* Screenshot Link */}
                  {t.screenshotUrl && (
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-slate-400" />
                        <span>Screenshot attached</span>
                      </span>
                      <a
                        href={t.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <span>View Image</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}

                  {/* Super Admin Response Remark */}
                  {t.adminNotes && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[11px] space-y-1">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Super Admin Resolution Remark:</span>
                      </div>
                      <div className="text-emerald-950 dark:text-emerald-100 font-medium pl-5 whitespace-pre-wrap">
                        {t.adminNotes}
                      </div>
                      {t.resolvedAt && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 pl-5">
                          Resolved on {new Date(t.resolvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
