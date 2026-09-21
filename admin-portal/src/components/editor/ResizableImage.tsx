'use client';

/**
 * ResizableImage — Custom Tiptap v3 node extension
 *
 * Extends @tiptap/extension-image with:
 *  - Persisted `width` attribute (stored as style="width: Xpx" in HTML)
 *  - React NodeView with 8 directional drag-to-resize handles
 *  - Floating mini-toolbar: Full / 1/2 / 1/3 / Auto + custom px input
 *  - Blue selection ring via `selected` prop (no MutationObserver — avoids cursor jump)
 *  - Width bounds: min 80px — max 100% of editor container
 */

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback, useState, useEffect } from 'react';

type HandleDir = 'e' | 'w' | 'se' | 'sw' | 'ne' | 'nw' | 's' | 'n';

const HANDLES: { dir: HandleDir; style: React.CSSProperties }[] = [
  { dir: 'nw', style: { top: -5,   left: -5,              cursor: 'nw-resize' } },
  { dir: 'n',  style: { top: -5,   left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
  { dir: 'ne', style: { top: -5,   right: -5,             cursor: 'ne-resize' } },
  { dir: 'e',  style: { top: '50%',right: -5,  transform: 'translateY(-50%)', cursor: 'e-resize' } },
  { dir: 'se', style: { bottom: -5, right: -5,            cursor: 'se-resize' } },
  { dir: 's',  style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
  { dir: 'sw', style: { bottom: -5, left: -5,             cursor: 'sw-resize' } },
  { dir: 'w',  style: { top: '50%', left: -5,  transform: 'translateY(-50%)', cursor: 'w-resize' } },
];

const MIN_WIDTH = 80;

// ─── ResizableImageView ───────────────────────────────────────────────────────
const ResizableImageView: React.FC<ReactNodeViewProps> = ({
  node,
  updateAttributes,
  selected,    // ← comes from NodeViewProps, set by ProseMirror selectNode/deselectNode
}) => {
  const attrs = node.attrs as { src: string; alt?: string; title?: string; width?: number | null };
  const { src, alt, title } = attrs;
  const nodeWidth: number | null = attrs.width ?? null;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef     = useRef<HTMLImageElement>(null);

  const dragRef = useRef<{ startX: number; startW: number; dir: HandleDir } | null>(null);

  // Local width tracks live drag; syncs back to node attrs on mouseup
  const [localWidth, setLocalWidth] = useState<number | null>(nodeWidth);
  const [customPx,   setCustomPx]   = useState<string>(nodeWidth ? String(nodeWidth) : '');

  // Sync when node attrs change externally (undo / redo / lang switch)
  useEffect(() => {
    setLocalWidth(nodeWidth);
    setCustomPx(nodeWidth ? String(nodeWidth) : '');
  }, [nodeWidth]);

  const applyWidth = useCallback(
    (w: number | null) => {
      const clamped = w === null ? null : Math.max(MIN_WIDTH, Math.round(w));
      setLocalWidth(clamped);
      setCustomPx(clamped !== null ? String(clamped) : '');
      updateAttributes({ width: clamped });
    },
    [updateAttributes],
  );

  const editorMaxWidth = () => {
    const el = wrapperRef.current?.closest('.tiptap') as HTMLElement | null;
    return el ? el.clientWidth : 800;
  };

  // ── Drag resize ──────────────────────────────────────────────────────────────
  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent, dir: HandleDir) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;

      dragRef.current = { startX: e.clientX, startW: img.getBoundingClientRect().width, dir };

      const onMouseMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const { startX, startW, dir: d } = dragRef.current;
        const dx = me.clientX - startX;
        let newW = d.includes('e') ? startW + dx : d.includes('w') ? startW - dx : startW;
        newW = Math.max(MIN_WIDTH, Math.min(editorMaxWidth(), newW));
        setLocalWidth(Math.round(newW));
        if (imgRef.current) imgRef.current.style.width = `${Math.round(newW)}px`;
      };

      const onMouseUp = () => {
        if (!dragRef.current) return;
        const finalW = imgRef.current
          ? Math.round(imgRef.current.getBoundingClientRect().width)
          : dragRef.current.startW;
        dragRef.current = null;
        applyWidth(finalW);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [applyWidth],
  );

  return (
    <NodeViewWrapper
      ref={wrapperRef as React.Ref<HTMLElement>}
      as="figure"
      // data-drag-handle tells ProseMirror this node can be dragged
      data-drag-handle
      style={{
        display: 'block',
        position: 'relative',
        lineHeight: 0,
        maxWidth: '100%',
        margin: '1rem 0',
        userSelect: 'none',
      }}
    >
      {/* The image itself */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        title={title || alt || ''}
        loading="lazy"
        draggable={false}
        style={{
          width:    localWidth !== null ? `${localWidth}px` : undefined,
          maxWidth: '100%',
          height:   'auto',
          display:  'block',
          borderRadius: '0.75rem',
          // Selection ring — driven by ProseMirror `selected` prop, NOT MutationObserver
          outline:      selected ? '2px solid #3b82f6' : 'none',
          outlineOffset: '3px',
          cursor: 'default',
        }}
      />

      {/* Handles + toolbar only when this node is ProseMirror-selected */}
      {selected && (
        <>
          {/* 8 resize handles */}
          {HANDLES.map(({ dir, style }) => (
            <div
              key={dir}
              onMouseDown={(e) => onHandleMouseDown(e, dir)}
              style={{
                position:        'absolute',
                width:           10,
                height:          10,
                backgroundColor: '#3b82f6',
                border:          '2px solid #fff',
                borderRadius:    2,
                zIndex:          10,
                ...style,
              }}
            />
          ))}

          {/* Floating mini toolbar */}
          <div
            style={{
              position:  'absolute',
              top:       -44,
              left:      '50%',
              transform: 'translateX(-50%)',
              display:   'flex',
              alignItems:'center',
              gap:       4,
              background:'#1e293b',
              borderRadius: 8,
              padding:   '4px 8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              whiteSpace:'nowrap',
              zIndex:    20,
            }}
            // Prevent toolbar clicks from propagating to ProseMirror (which would move cursor)
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Btn title="Full Width"   onClick={() => applyWidth(editorMaxWidth())}>Full</Btn>
            <Btn title="Half Width"   onClick={() => applyWidth(Math.round(editorMaxWidth() / 2))}>1/2</Btn>
            <Btn title="Third Width"  onClick={() => applyWidth(Math.round(editorMaxWidth() / 3))}>1/3</Btn>
            <Btn title="Natural Size" onClick={() => applyWidth(null)}>Auto</Btn>

            <div style={{ width: 1, height: 16, background: '#334155', margin: '0 2px' }} />

            <input
              type="number"
              min={MIN_WIDTH}
              value={customPx}
              onChange={(e) => setCustomPx(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { const px = parseInt(customPx, 10); if (!isNaN(px)) applyWidth(px); }
              }}
              onBlur={() => { const px = parseInt(customPx, 10); if (!isNaN(px)) applyWidth(px); }}
              style={{
                width:      52,
                background: '#0f172a',
                border:     '1px solid #334155',
                borderRadius: 4,
                color:      '#e2e8f0',
                fontSize:   11,
                padding:    '2px 4px',
                outline:    'none',
                textAlign:  'center',
              }}
            />
            <span style={{ color: '#64748b', fontSize: 11 }}>px</span>
          </div>
        </>
      )}
    </NodeViewWrapper>
  );
};

// Minimal toolbar button
const Btn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    style={{
      background: 'transparent',
      border:     'none',
      color:      '#e2e8f0',
      fontSize:   11,
      fontWeight: 600,
      padding:    '2px 6px',
      borderRadius: 4,
      cursor:     'pointer',
      lineHeight: 1.5,
    }}
  >
    {children}
  </button>
);

// ─── Tiptap Extension ────────────────────────────────────────────────────────
export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute('width');
          if (w) return parseInt(w, 10) || null;
          const m = (el.getAttribute('style') || '').match(/width:\s*(\d+)px/);
          return m ? parseInt(m[1], 10) : null;
        },
        renderHTML: (attrs) =>
          attrs.width ? { style: `width: ${attrs.width}px; max-width: 100%; height: auto;` } : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView as React.ComponentType<ReactNodeViewProps>);
  },
});
