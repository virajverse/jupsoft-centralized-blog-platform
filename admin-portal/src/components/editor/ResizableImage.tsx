'use client';

/**
 * ResizableImage — Custom Tiptap node extension
 *
 * Extends the built-in @tiptap/extension-image with:
 *  - Persisted `width` attribute (stored as style="width: Xpx" in HTML)
 *  - React NodeView with 8 directional drag-to-resize handles
 *  - Floating mini-toolbar: Full Width | Half | Auto + custom px input
 *  - Blue selection ring when focused
 *  - Width bounds: min 80px — max 100% of editor container
 */

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback, useState, useEffect } from 'react';

// ─── Resize Handle Directions ─────────────────────────────────────────────────
type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: { dir: HandleDir; style: React.CSSProperties }[] = [
  { dir: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
  { dir: 'n',  style: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
  { dir: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
  { dir: 'e',  style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' } },
  { dir: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
  { dir: 's',  style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
  { dir: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
  { dir: 'w',  style: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'w-resize' } },
];

const MIN_WIDTH = 80;

// ─── ResizableImageView (React NodeView) ──────────────────────────────────────
const ResizableImageView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const { src, alt, title, width: nodeWidth } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number | null;
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    dir: HandleDir;
    aspectRatio: number;
  } | null>(null);

  const [localWidth, setLocalWidth] = useState<number | null>(nodeWidth ?? null);
  const [customPx, setCustomPx] = useState<string>(nodeWidth ? String(nodeWidth) : '');

  // Keep local width in sync when node attrs change externally (e.g. undo/redo)
  useEffect(() => {
    setLocalWidth(nodeWidth ?? null);
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

  // ── Drag resize logic ──────────────────────────────────────────────────────
  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent, dir: HandleDir) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
        dir,
        aspectRatio: rect.width / rect.height,
      };

      const onMouseMove = (me: MouseEvent) => {
        if (!dragState.current || !wrapperRef.current) return;
        const { startX, startW, dir: d, aspectRatio } = dragState.current;

        // Determine max width from editor container
        const editorEl = wrapperRef.current.closest('.tiptap') as HTMLElement | null;
        const maxWidth = editorEl ? editorEl.clientWidth : window.innerWidth;

        const dx = me.clientX - startX;
        let newW = startW;

        if (d.includes('e')) newW = startW + dx;
        else if (d.includes('w')) newW = startW - dx;

        // Clamp
        newW = Math.max(MIN_WIDTH, Math.min(maxWidth, newW));
        setLocalWidth(Math.round(newW));

        // Live-resize the img element without committing to ProseMirror on every pixel
        if (img) img.style.width = `${Math.round(newW)}px`;
      };

      const onMouseUp = () => {
        if (!dragState.current) return;
        const finalW = imgRef.current
          ? Math.round(imgRef.current.getBoundingClientRect().width)
          : dragState.current.startW;
        dragState.current = null;
        applyWidth(finalW);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [applyWidth],
  );

  // ── Computed style for the image ───────────────────────────────────────────
  const imgStyle: React.CSSProperties = {
    width: localWidth !== null ? `${localWidth}px` : undefined,
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
  };

  const isSelected = selected;

  return (
    <NodeViewWrapper
      as="figure"
      className="resizable-image-wrapper"
      style={{
        display: 'inline-block',
        position: 'relative',
        lineHeight: 0,
        maxWidth: '100%',
        margin: '1rem auto',
        userSelect: 'none',
      }}
      data-drag-handle
    >
      {/* Image element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        title={title || alt || ''}
        loading="lazy"
        draggable={false}
        style={{
          ...imgStyle,
          borderRadius: '0.75rem',
          outline: isSelected ? '2px solid #3b82f6' : 'none',
          outlineOffset: '2px',
          cursor: 'default',
        }}
      />

      {/* Resize handles — only show when selected */}
      {isSelected && (
        <>
          {HANDLES.map(({ dir, style }) => (
            <div
              key={dir}
              onMouseDown={(e) => onHandleMouseDown(e, dir)}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                backgroundColor: '#3b82f6',
                border: '2px solid #fff',
                borderRadius: 2,
                zIndex: 10,
                ...style,
              }}
            />
          ))}

          {/* Floating mini toolbar */}
          <div
            style={{
              position: 'absolute',
              top: -44,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#1e293b',
              borderRadius: 8,
              padding: '4px 8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
              zIndex: 20,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Full width */}
            <button
              type="button"
              title="Full Width"
              style={toolbarBtnStyle}
              onClick={() => {
                const editorEl = wrapperRef.current?.closest('.tiptap') as HTMLElement | null;
                const maxWidth = editorEl ? editorEl.clientWidth : 800;
                applyWidth(maxWidth);
              }}
            >
              Full
            </button>

            {/* Half width */}
            <button
              type="button"
              title="Half Width"
              style={toolbarBtnStyle}
              onClick={() => {
                const editorEl = wrapperRef.current?.closest('.tiptap') as HTMLElement | null;
                const halfWidth = editorEl ? Math.round(editorEl.clientWidth / 2) : 400;
                applyWidth(halfWidth);
              }}
            >
              1/2
            </button>

            {/* One-third width */}
            <button
              type="button"
              title="One-Third Width"
              style={toolbarBtnStyle}
              onClick={() => {
                const editorEl = wrapperRef.current?.closest('.tiptap') as HTMLElement | null;
                const thirdWidth = editorEl ? Math.round(editorEl.clientWidth / 3) : 267;
                applyWidth(thirdWidth);
              }}
            >
              1/3
            </button>

            {/* Auto (natural) */}
            <button
              type="button"
              title="Auto / Natural Size"
              style={toolbarBtnStyle}
              onClick={() => applyWidth(null)}
            >
              Auto
            </button>

            {/* Separator */}
            <div style={{ width: 1, height: 16, background: '#334155', margin: '0 2px' }} />

            {/* Custom px input */}
            <input
              type="number"
              min={MIN_WIDTH}
              value={customPx}
              onChange={(e) => setCustomPx(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const px = parseInt(customPx, 10);
                  if (!isNaN(px)) applyWidth(px);
                }
              }}
              onBlur={() => {
                const px = parseInt(customPx, 10);
                if (!isNaN(px)) applyWidth(px);
              }}
              placeholder="px"
              style={{
                width: 52,
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 4,
                color: '#e2e8f0',
                fontSize: 11,
                padding: '2px 4px',
                outline: 'none',
                textAlign: 'center',
              }}
            />
            <span style={{ color: '#64748b', fontSize: 11 }}>px</span>
          </div>
        </>
      )}
    </NodeViewWrapper>
  );
};

// Shared toolbar button style
const toolbarBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#e2e8f0',
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  cursor: 'pointer',
  lineHeight: 1.5,
};

// ─── ResizableImage Tiptap Extension ─────────────────────────────────────────
export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          // Support both width attr and style="width: Xpx"
          const w = el.getAttribute('width');
          if (w) return parseInt(w, 10) || null;
          const style = el.getAttribute('style') || '';
          const match = style.match(/width:\s*(\d+)px/);
          return match ? parseInt(match[1], 10) : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { style: `width: ${attrs.width}px; max-width: 100%; height: auto;` };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
