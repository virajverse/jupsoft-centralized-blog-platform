import { Injectable, Logger } from '@nestjs/common';
import { TranslateDto } from './dto/translate.dto';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  /**
   * Translate a single text string using MyMemory Translation API.
   * Handles character limit chunking (<= 400 chars per request).
   */
  async translateSingle(text: string, from: string, to: string): Promise<string> {
    const trimmed = (text || '').trim();
    if (!trimmed) return text;
    if (from.toLowerCase() === to.toLowerCase()) return text;

    // If text exceeds 400 chars, split into sentence-based chunks
    if (trimmed.length > 400) {
      const sentences = trimmed.split(/(?<=[.!?\n।])\s+/).filter(Boolean);
      const translatedSentences: string[] = [];
      for (const sentence of sentences) {
        const tr = await this.queryMyMemory(sentence, from, to);
        translatedSentences.push(tr);
      }
      return translatedSentences.join(' ');
    }

    return this.queryMyMemory(trimmed, from, to);
  }

  private async queryMyMemory(query: string, from: string, to: string): Promise<string> {
    try {
      const pair = `${from.toLowerCase()}|${to.toLowerCase()}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${pair}`;
      
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'Jupsoft-CMS-Translator/1.0',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        this.logger.warn(`Translation HTTP error ${res.status} for pair ${pair}`);
        return query;
      }

      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && typeof translated === 'string') {
        return translated;
      }
    } catch (err: any) {
      this.logger.error(`Translation network failed for "${query.substring(0, 30)}...": ${err.message}`);
    }
    return query;
  }

  /**
   * Translate HTML content while strictly preserving all HTML tags and attributes.
   */
  async translateHtml(html: string, from: string, to: string): Promise<string> {
    if (!html || !html.trim()) return '';
    if (from.toLowerCase() === to.toLowerCase()) return html;

    const tokens = html.split(/(<[^>]+>)/g);
    const results: string[] = [];

    for (const tok of tokens) {
      if (tok.startsWith('<') && tok.endsWith('>')) {
        // Retain HTML tag as-is
        results.push(tok);
      } else if (tok.trim().length > 0) {
        const translated = await this.translateSingle(tok, from, to);
        results.push(translated);
      } else {
        results.push(tok);
      }
    }

    return results.join('');
  }

  /**
   * Main translation handler for blog fields or raw text.
   */
  async translate(dto: TranslateDto) {
    const { from, to, title, excerpt, content, text } = dto;

    const result: {
      success: boolean;
      from: string;
      to: string;
      title?: string;
      excerpt?: string;
      content?: string;
      translatedText?: string;
    } = {
      success: true,
      from,
      to,
    };

    if (title) {
      result.title = await this.translateSingle(title, from, to);
    }

    if (excerpt) {
      result.excerpt = await this.translateSingle(excerpt, from, to);
    }

    if (content) {
      result.content = await this.translateHtml(content, from, to);
    }

    if (text) {
      result.translatedText = await this.translateSingle(text, from, to);
    }

    return result;
  }
}
