'use client';

/**
 * CalloutBox — Custom TipTap node extension for Highlight & Callout Boxes
 * 
 * Supports info, warning, success, and neutral container boxes with preserved
 * borders, backgrounds, and full inner block content (paragraphs, lists, bold, etc.).
 * Allows pasting boxes from external sources (ChatGPT, Claude, Notion, Docs).
 */

import { Node, mergeAttributes } from '@tiptap/react';

export interface CalloutBoxOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calloutBox: {
      setCalloutBox: (attributes?: { type?: 'info' | 'warning' | 'success' | 'neutral' }) => ReturnType;
      toggleCalloutBox: (attributes?: { type?: 'info' | 'warning' | 'success' | 'neutral' }) => ReturnType;
      unsetCalloutBox: () => ReturnType;
    };
  }
}

export const CalloutBox = Node.create<CalloutBoxOptions>({
  name: 'calloutBox',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => {
          const dataType = element.getAttribute('data-type');
          if (dataType && ['info', 'warning', 'success', 'neutral'].includes(dataType)) {
            return dataType;
          }
          const className = element.className || '';
          if (typeof className === 'string') {
            if (className.includes('warning') || className.includes('caution') || className.includes('danger')) return 'warning';
            if (className.includes('success')) return 'success';
            if (className.includes('neutral') || className.includes('card')) return 'neutral';
          }
          return 'info';
        },
        renderHTML: (attributes) => ({
          'data-type': attributes.type || 'info',
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.callout-box' },
      { tag: 'div.callout' },
      { tag: 'div.info-box' },
      { tag: 'div.alert-box' },
      { tag: 'div.warning-box' },
      { tag: 'div.success-box' },
      { tag: 'div.note-box' },
      { tag: 'div.notice' },
      { tag: 'div[data-type]' },
      { tag: 'aside.callout' },
      { tag: 'aside' },
      { tag: 'blockquote.callout' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.type || 'info';
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `callout-box callout-${type}`,
        'data-type': type,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCalloutBox:
        (attributes) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleCalloutBox:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
      unsetCalloutBox:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },
});
