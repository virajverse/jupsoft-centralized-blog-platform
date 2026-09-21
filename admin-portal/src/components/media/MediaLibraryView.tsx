'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { useQueryState } from '../../hooks/useQueryState';
import { 
  UploadCloud, 
  Copy, 
  Check, 
  Trash2, 
  Image as ImageIcon,
  X,
  RefreshCw
} from 'lucide-react';
import { MediaItem } from '../../types';
import { apiClient } from '../../services/apiClient';
import { resolveMediaUrl, extractS3Key } from '../../utils/mediaUtils';

export const MediaLibraryView: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    media, 
    activeWebsiteId, 
    websites, 
    addMediaItem, 
    deleteMediaItem,
    activeRole,
    fetchMedia,
    setActiveWebsite,
  } = useBlogStore(
    useShallow((s) => ({
      media: s.media,
      activeWebsiteId: s.activeWebsiteId,
      websites: s.websites,
      addMediaItem: s.addMediaItem,
      deleteMediaItem: s.deleteMediaItem,
      activeRole: s.activeRole,
      fetchMedia: s.fetchMedia,
      setActiveWebsite: s.setActiveWebsite,
    }))
  );

  // URL query state
  const siteParam = searchParams.get('site');
  const tenantParam = searchParams.get('tenant');
  const viewParam = searchParams.get('view');

  const effectiveSiteId = siteParam && (siteParam === 'all' || websites.some((w) => w.id === siteParam))
    ? siteParam
    : activeWebsiteId;

  const isAllSites = effectiveSiteId === 'all';

  useEffect(() => {
    if (siteParam && siteParam !== activeWebsiteId && (siteParam === 'all' || websites.some((w) => w.id === siteParam))) {
      setActiveWebsite(siteParam);
    }
    fetchMedia(effectiveSiteId);
  }, [effectiveSiteId, siteParam, activeWebsiteId, websites, setActiveWebsite, fetchMedia]);

  // Derive target site directly from URL state
  const targetSiteId = (tenantParam && websites.some((w) => w.id === tenantParam))
    ? tenantParam
    : (isAllSites ? websites[0]?.id : effectiveSiteId);

  const activeSite = websites.find((w) => w.id === (isAllSites ? targetSiteId : effectiveSiteId)) || websites[0];
  
  // Deduplicate by item.id so duplicate keys never occur in DOM
  const siteMedia = useMemo(() => {
    const raw = isAllSites 
      ? (tenantParam && tenantParam !== 'all' ? media.filter((m) => m.websiteId === tenantParam) : media) 
      : media.filter((m) => m.websiteId === effectiveSiteId);
    const seen = new Set<string>();
    return raw.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [isAllSites, tenantParam, media, effectiveSiteId]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inspectedItem = viewParam ? media.find((m) => m.id === viewParam) : null;

  const copyCdnUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // TRD §10: Hybrid upload pipeline (Server-side sharp WebP with client-side canvas fallback)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    const uploadSiteId = isAllSites ? targetSiteId : activeWebsiteId;
    const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';

    try {
      // Step 1: Attempt server-side WebP pipeline via NestJS backend (TRD §10)
      const res = await apiClient.uploadMedia(file, uploadSiteId, cleanName);
      if (res && res.cdnUrl) {
        const newItem: MediaItem = {
          id: res.id || `med-${Date.now()}`,
          websiteId: uploadSiteId,
          fileName: res.fileName || cleanName,
          fileType: 'image/webp',
          fileSizeBytes: res.fileSizeBytes || file.size,
          s3Key: extractS3Key(res.s3Key || res.cdnUrl),
          cdnUrl: resolveMediaUrl(res.cdnUrl),
          altText: cleanName.replace(/[-_]/g, ' ').replace('.webp', ''),
          dimensions: res.dimensions || { width: 800, height: 600 },
          uploadedBy: activeRole,
          createdAt: new Date().toISOString(),
        };
        addMediaItem(newItem);
        setParam('view', newItem.id);
        setProcessing(false);
        e.target.value = '';
        return;
      }
    } catch (apiErr) {
      console.warn('Backend media upload failed, falling back to browser canvas conversion:', apiErr);
    }

    // Step 2: Fallback to client-side canvas WebP conversion
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for WebP conversion
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Real WebP encoding
          const webpDataUrl = canvas.toDataURL('image/webp', 0.88);
          const head = 'data:image/webp;base64,';
          const sizeInBytes = Math.round((webpDataUrl.length - head.length) * 3 / 4);

          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';

          const uploadSiteId = isAllSites ? targetSiteId : activeWebsiteId;
          const uploadSite = websites.find((w) => w.id === uploadSiteId) || websites[0];

          const newItem: MediaItem = {
            id: `med-${Date.now()}`,
            websiteId: uploadSiteId,
            fileName: cleanName,
            fileType: 'image/webp',
            fileSizeBytes: sizeInBytes,
            s3Key: `blogs/${uploadSite.s3Prefix}/${yyyy}/${mm}/${cleanName}`,
            cdnUrl: webpDataUrl,
            altText: cleanName.replace(/[-_]/g, ' ').replace('.webp', ''),
            dimensions: { width: img.width, height: img.height },
            uploadedBy: activeRole,
            createdAt: new Date().toISOString(),
          };

          addMediaItem(newItem);
          setParam('view', newItem.id);
        }
        setProcessing(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Media Asset Manager
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              {isAllSites ? 'All Websites' : (activeSite?.name || 'Website')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMedia()}
            disabled={processing}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh media library from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            disabled={processing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{processing ? 'Processing WebP...' : 'Upload Image File'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Tenant Filter Pills (Only in All Websites scope) */}
      {isAllSites && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setParam('tenant', null)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              !tenantParam || tenantParam === 'all'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Sites ({media.length})
          </button>
          {websites.map((site) => {
            const siteCount = media.filter((m) => m.websiteId === site.id).length;
            const isSelected = tenantParam === site.id;
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => setParam('tenant', site.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {site.name} ({siteCount})
              </button>
            );
          })}
        </div>
      )}

      {/* Media Grid or Real Empty State */}
      {siteMedia.length === 0 ? (
        <div className="bg-white dark:bg-[#0f172a] border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No media uploaded yet</h3>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            Upload Image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {siteMedia.map((item) => {
            const itemSite = websites.find((w) => w.id === item.websiteId);
            return (
              <div
                key={item.id}
                onClick={() => setParam('view', item.id)}
                className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden flex flex-col group shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                  <img
                    src={resolveMediaUrl(item.cdnUrl)}
                    alt={item.altText}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono font-medium">
                    WebP
                  </span>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-200 font-mono">
                    {item.dimensions ? `${item.dimensions.width}×${item.dimensions.height}` : 'WebP'}
                  </span>
                </div>

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    {isAllSites && itemSite && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 inline-block mb-1">
                        {itemSite.name}
                      </span>
                    )}
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={item.fileName}>
                      {item.fileName}
                    </h4>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate mt-0.5">
                      &quot;{item.altText}&quot;
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{(item.fileSizeBytes / 1024).toFixed(0)} KB</span>
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => copyCdnUrl(item.id, resolveMediaUrl(item.cdnUrl))}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Copy image URL"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteMediaItem(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Inspector Modal - URL bound (?view=[id]) */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Media Asset Details</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {inspectedItem.fileType}
                </span>
              </div>
              <button
                onClick={() => setParam('view', null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video flex items-center justify-center">
                <img
                  src={resolveMediaUrl(inspectedItem.cdnUrl)}
                  alt={inspectedItem.altText}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">File Name</span>
                  <div className="text-slate-900 dark:text-white font-semibold font-mono truncate">{inspectedItem.fileName}</div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Resolution &amp; Size</span>
                  <div className="text-slate-900 dark:text-white font-mono">
                    {inspectedItem.dimensions ? `${inspectedItem.dimensions.width} × ${inspectedItem.dimensions.height} px · ` : ''}{(inspectedItem.fileSizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">S3 Key Path</span>
                  <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px] break-all bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    {extractS3Key(inspectedItem.s3Key || inspectedItem.cdnUrl)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium mb-1">CDN Data URL</span>
                  <button
                    onClick={() => copyCdnUrl(inspectedItem.id, resolveMediaUrl(inspectedItem.cdnUrl))}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors font-medium border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {copiedId === inspectedItem.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === inspectedItem.id ? 'Copied to Clipboard' : 'Copy Image Link'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setParam('view', null)}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
