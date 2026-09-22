/**
 * HTML Sanitize Pipe — TRD §15 (Security: XSS Protection)
 *
 * TRD §15: "XSS sanitization applied to all rich-text content fields before persistence."
 * Uses sanitize-html to strip dangerous tags/attributes while preserving safe blog HTML.
 *
 * Allowed tags: standard blog HTML (h1–h6, p, a, ul, ol, li, code, pre, img, table, etc.)
 * Disallowed: <script>, <iframe>, <object>, on* event attributes, javascript: URLs
 */

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import type SanitizeHtml from 'sanitize-html';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sanitizeHtml = require('sanitize-html') as typeof SanitizeHtml;

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'a', 'ul', 'ol', 'li',
  'blockquote', 'q', 'cite',
  'code', 'pre', 'kbd', 'samp', 'var',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'img', 'figure', 'figcaption',
  'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main',
];

const ALLOWED_ATTRIBUTES: SanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'data-rotate', 'data-align', 'data-width'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  '*': ['class', 'id', 'style'],
};

const ALLOWED_STYLES: SanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    'text-align': [/.*/],
    'color': [/.*/],
    'background-color': [/.*/],
  },
  img: {
    'transform': [/.*/],
    'transform-origin': [/.*/],
    'width': [/.*/],
    'max-width': [/.*/],
    'height': [/.*/],
    'margin-left': [/.*/],
    'margin-right': [/.*/],
    'display': [/.*/],
  },
};

export function sanitizeContent(html: string): string {
  if (!html) return html;
  const sanitized = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ['http', 'https', 'mailto'], // TRD §15: block javascript: URIs
  });
  // Preserve empty paragraphs authored in WYSIWYG editor.
  // Empty <p></p> tags collapse to 0px height in browsers due to CSS margin collapsing.
  // Converting empty <p></p> tags to <p><br></p> guarantees visible vertical line breaks across all frontend renderers.
  return sanitized.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '<p><br></p>');
}

@Injectable()
export class HtmlSanitizePipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return sanitizeContent(value);
    }
    return value;
  }
}
