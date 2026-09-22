'use client';

/**
 * ResizableImage — Custom Tiptap v3 node extension
 *
 * Extends @tiptap/extension-image with:
 *  - Persisted `width` attribute (style="width: Xpx")
 *  - Persisted `alignment` attribute ('left' | 'center' | 'right')
 *  - Persisted `rotate` attribute (0° to 360° rotation)
 *  - React NodeView with 8 directional drag-to-resize handles
 *  - Floating toolbar with:
 *     * Alignment toggles (Left, Center / Biche me, Right)
 *     * Free & 90° Rotation controls (↺ -90°, ↻ +90°, free angle input & 0° reset)
 *     * Width presets (Full / 1/2 / 1/3 / Auto) + custom px input
 *  - Blue selection ring via ProseMirror `selected` prop
 *  - Universal HTML persistence for Preview & live site rendering
 */

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  RotateCcw, 
  RotateCw, 
  Rotate3d 
} from 'lucide-react';

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
  selected,
}) => {
  const attrs = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number | null;
    alignment?: 'left' | 'center' | 'right';
    rotate?: number;
  };
  const { src, alt, title } = attrs;
  const nodeWidth: number | null = attrs.width ?? null;
  const alignment: 'left' | 'center' | 'right' = attrs.alignment || 'center';
  const rotate: number = Number(attrs.rotate) || 0;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef     = useRef<HTMLImageElement>(null);

  const dragRef = useRef<{ startX: number; startW: number; dir: HandleDir } | null>(null);

  // Local width & rotation track live interactions; syncs back to node attrs on mouseup/update
  const [localWidth,  setLocalWidth]  = useState<number | null>(nodeWidth);
  const [customPx,    setCustomPx]    = useState<string>(nodeWidth ? String(nodeWidth) : '');
  const [localRotate, setLocalRotate] = useState<number>(rotate);

  // Sync when node attrs change externally (undo / redo / lang switch)
  useEffect(() => {
    queueMicrotask(() => {
      setLocalWidth(nodeWidth);
      setCustomPx(nodeWidth ? String(nodeWidth) : '');
      setLocalRotate(rotate);
    });
  }, [nodeWidth, rotate]);

  const applyWidth = useCallback(
    (w: number | null) => {
      const clamped = w === null ? null : Math.max(MIN_WIDTH, Math.round(w));
      setLocalWidth(clamped);
      setCustomPx(clamped !== null ? String(clamped) : '');
      updateAttributes({ width: clamped });
    },
    [updateAttributes],
  );

  const applyAlignment = useCallback(
    (align: 'left' | 'center' | 'right') => {
      updateAttributes({ alignment: align });
    },
    [updateAttributes],
  );

  const applyRotation = useCallback(
    (deg: number) => {
      const normalized = ((deg % 360) + 360) % 360;
      setLocalRotate(normalized);
      if (imgRef.current) {
        imgRef.current.style.transform = normalized !== 0 ? `rotate(${normalized}deg)` : 'none';
      }
      updateAttributes({ rotate: normalized });
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
      data-drag-handle
      style={{
        display: 'flex',
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
        width: '100%',
        margin: '1.5rem 0',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Inner Image Container (Hugs image width for precise handles & positioning) */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          maxWidth: '100%',
          lineHeight: 0,
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
            width: localWidth !== null ? `${localWidth}px` : undefined,
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: '0.75rem',
            transform: localRotate !== 0 ? `rotate(${localRotate}deg)` : 'none',
            transformOrigin: 'center center',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            outline: selected ? '2px solid #3b82f6' : 'none',
            outlineOffset: '3px',
            cursor: 'default',
          }}
        />

        {/* Handles + toolbar only when this node is selected */}
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

            {/* Floating Rich Tool bar */}
            <div
              style={{
                position:  'absolute',
                top:       -48,
                left:      '50%',
                transform: 'translateX(-50%)',
                display:   'flex',
                alignItems:'center',
                gap:       4,
                background:'#0f172a',
                border:    '1px solid #334155',
                borderRadius: 8,
                padding:   '4px 8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                whiteSpace:'nowrap',
                zIndex:    30,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* 1. Alignment Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  title="Align Left"
                  active={alignment === 'left'}
                  onClick={() => applyAlignment('left')}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  title="Align Center (Biche me)"
                  active={alignment === 'center'}
                  onClick={() => applyAlignment('center')}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  title="Align Right (Right side)"
                  active={alignment === 'right'}
                  onClick={() => applyAlignment('right')}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </IconButton>
              </div>

              <Divider />

              {/* 2. Rotation Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  title="Rotate -90° (Counter-Clockwise)"
                  onClick={() => applyRotation(localRotate - 90)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  title="Rotate +90° (Clockwise)"
                  onClick={() => applyRotation(localRotate + 90)}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </IconButton>

                {/* Free Angle Input / Quick Degree Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 2px' }}>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    step="15"
                    value={localRotate}
                    title="Enter custom rotation angle (0° - 360°)"
                    onChange={(e) => applyRotation(parseInt(e.target.value, 10) || 0)}
                    style={{
                      width:      42,
                      background: '#1e293b',
                      border:     '1px solid #334155',
                      borderRadius: 4,
                      color:      '#38bdf8',
                      fontSize:   11,
                      padding:    '2px 2px',
                      outline:    'none',
                      textAlign:  'center',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ color: '#64748b', fontSize: 11 }}>°</span>
                </div>

                {localRotate !== 0 && (
                  <button
                    type="button"
                    title="Reset rotation to 0°"
                    onClick={() => applyRotation(0)}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              <Divider />

              {/* 3. Width Presets */}
              <Btn title="Full Width"   onClick={() => applyWidth(editorMaxWidth())}>Full</Btn>
              <Btn title="Half Width"   onClick={() => applyWidth(Math.round(editorMaxWidth() / 2))}>1/2</Btn>
              <Btn title="Third Width"  onClick={() => applyWidth(Math.round(editorMaxWidth() / 3))}>1/3</Btn>
              <Btn title="Natural Size" onClick={() => applyWidth(null)}>Auto</Btn>

              <Divider />

              {/* 4. Custom Pixel Width Input */}
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
                  width:      48,
                  background: '#1e293b',
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
      </div>
    </NodeViewWrapper>
  );
};

// Divider element
const Divider: React.FC = () => (
  <div style={{ width: 1, height: 16, background: '#334155', margin: '0 2px' }} />
);

// Minimal text button
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
      padding:    '2px 5px',
      borderRadius: 4,
      cursor:     'pointer',
      lineHeight: 1.5,
    }}
  >
    {children}
  </button>
);

// Icon button with active state
const IconButton: React.FC<{ 
  title: string; 
  active?: boolean; 
  onClick: () => void; 
  children: React.ReactNode 
}> = ({ title, active, onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     active ? '#3b82f6' : 'transparent',
      border:         'none',
      color:          active ? '#ffffff' : '#94a3b8',
      padding:        '3px 4px',
      borderRadius:   4,
      cursor:         'pointer',
      transition:     'background 0.15s, color 0.15s',
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
      },
      alignment: {
        default: 'center',
        parseHTML: (el) => {
          const align = el.getAttribute('data-align');
          if (align && ['left', 'center', 'right'].includes(align)) return align;
          const style = el.getAttribute('style') || '';
          if (style.includes('margin-left: auto') && style.includes('margin-right: auto')) return 'center';
          if (style.includes('margin-left: auto') || style.includes('margin-right: 0')) return 'right';
          if (style.includes('margin-left: 0') || style.includes('margin-right: auto')) return 'left';
          return 'center';
        },
      },
      rotate: {
        default: 0,
        parseHTML: (el) => {
          const r = el.getAttribute('data-rotate');
          if (r) return parseInt(r, 10) || 0;
          const m = (el.getAttribute('style') || '').match(/rotate\((-?\d+)deg\)/);
          return m ? parseInt(m[1], 10) || 0 : 0;
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as {
      width?: number | null;
      alignment?: 'left' | 'center' | 'right';
      rotate?: number;
    };

    const styles: string[] = ['max-width: 100%', 'height: auto'];

    if (attrs.width) {
      styles.push(`width: ${attrs.width}px`);
    }

    const align = attrs.alignment || 'center';
    if (align === 'center') {
      styles.push('margin-left: auto', 'margin-right: auto', 'display: block');
    } else if (align === 'right') {
      styles.push('margin-left: auto', 'margin-right: 0', 'display: block');
    } else if (align === 'left') {
      styles.push('margin-left: 0', 'margin-right: auto', 'display: block');
    }

    const rot = Number(attrs.rotate) || 0;
    if (rot !== 0) {
      styles.push(`transform: rotate(${rot}deg)`, 'transform-origin: center center');
    }

    return [
      'img',
      {
        ...HTMLAttributes,
        style: styles.join('; ') + ';',
        'data-align': align,
        'data-rotate': String(rot),
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView as React.ComponentType<ReactNodeViewProps>);
  },
});
