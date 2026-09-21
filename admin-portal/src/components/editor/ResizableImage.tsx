'use client';

/**
 * ResizableImage — Custom Tiptap v3 node extension
 *
 * Extends @tiptap/extension-image with:
 *  - Persisted `width` attribute (stored as style="width: Xpx" in HTML)
 *  - React NodeView with 8 directional drag-to-resize handles
 *  - Floating mini-toolbar: Full Width | 1/2 | 1/3 | Auto + custom px input
 *  - Blue selection ring on node selection (via ProseMirror-selectednode CSS class)
 *  - Width bounds: min 80px — max 100% of editor container
 */

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback, useState, useEffect } from 'react';

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
const ResizableImageView: React.FC<ReactNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const attrs = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number | null;
  };

  const { src, alt, title } = attrs;
  const nodeWidth = attrs.width ?? null;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{
    startX: number;
    startW: number;
    dir: HandleDir;
  } | null>(null);

  const [localWidth, setLocalWidth] = useState<number | null>(nodeWidth);
  const [customPx, setCustomPx] = useState<string>(nodeWidth ? String(nodeWidth) : '');
  const [isSelected, setIsSelected] = useState(false);

  // Sync local width when node attrs change (undo/redo)
  useEffect(() => {
    setLocalWidth(nodeWidth);
    setCustomPx(nodeWidth ? String(nodeWidth) : '');
  }, [nodeWidth]);

  // Track selection via ProseMirror-selectednode class on wrapper
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      setIsSelected(el.classList.contains('ProseMirror-selectednode'));
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    setIsSelected(el.classList.contains('ProseMirror-selectednode'));
    return () => observer.disconnect();
  }, []);

  const applyWidth = useCallback(
    (w: number | null) => {
      const clamped = w === null ? null : Math.max(MIN_WIDTH, Math.round(w));
      setLocalWidth(clamped);
      setCustomPx(clamped !== null ? String(clamped) : '');
      updateAttributes({ width: clamped });
    },
    [updateAttributes],
  );

  // ── Drag resize ──────────────────────────────────────────────────────────────
  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent, dir: HandleDir) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      dragState.current = { startX: e.clientX, startW: rect.width, dir };

      const onMouseMove = (me: MouseEvent) => {
        if (!dragState.current) return;
        const { startX, startW, dir: d } = dragState.current;

        const editorEl = wrapperRef.current?.closest('.tiptap') as HTMLElement | null;
        const maxWidth = editorEl ? editorEl.clientWidth : window.innerWidth;

        const dx = me.clientX - startX;
        let newW = d.includes('e') ? startW + dx : d.includes('w') ? startW - dx : startW;
        newW = Math.max(MIN_WIDTH, Math.min(maxWidth, newW));

        setLocalWidth(Math.round(newW));
        if (imgRef.current) imgRef.current.style.width = `${Math.round(newW)}px`;
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

  const getEditorWidth = () => {
    const editorEl = wrapperRef.current?.closest('.tiptap') as HTMLElement | null;
    return editorEl ? editorEl.clientWidth : 800;
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef as React.Ref<HTMLElement>}
      as="figure"
      style={{
        display: 'block',
        position: 'relative',
        lineHeight: 0,
        maxWidth: '100%',
        margin: '1rem 0',
        userSelect: 'none',
      }}
    >
      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        title={title || alt || ''}
        loading="lazy"
        draggable={false}
        style={{
          width: localWidth !== null ? `${localWidth}px` : undefined,
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: '0.75rem',
          outline: isSelected ? '2px solid #3b82f6' : 'none',
          outlineOffset: '3px',
          cursor: 'default',
        }}
      />

      {/* Resize handles + floating toolbar — only when selected */}
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

          {/* Floating toolbar */}
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
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
              zIndex: 20,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ToolbarBtn title="Full Width"   onClick={() => applyWidth(getEditorWidth())}>Full</ToolbarBtn>
            <ToolbarBtn title="Half Width"   onClick={() => applyWidth(Math.round(getEditorWidth() / 2))}>1/2</ToolbarBtn>
            <ToolbarBtn title="Third Width"  onClick={() => applyWidth(Math.round(getEditorWidth() / 3))}>1/3</ToolbarBtn>
            <ToolbarBtn title="Natural Size" onClick={() => applyWidth(null)}>Auto</ToolbarBtn>

            <div style={{ width: 1, height: 16, background: '#334155', margin: '0 2px' }} />

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

// Small reusable toolbar button
const ToolbarBtn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({
  title,
  onClick,
  children,
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    style={{
      background: 'transparent',
      border: 'none',
      color: '#e2e8f0',
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: 4,
      cursor: 'pointer',
      lineHeight: 1.5,
    }}
  >
    {children}
  </button>
);

// ─── ResizableImage Tiptap Extension ─────────────────────────────────────────
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
    return ReactNodeViewRenderer(ResizableImageView as React.ComponentType<ReactNodeViewProps>);
  },
});
