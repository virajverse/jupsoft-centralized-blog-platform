import { Injectable, Logger } from '@nestjs/common';
import { TranslateDto } from './dto/translate.dto';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  /**
   * Helper function: Run translation promises in controlled batches
   * This speeds up processing 5x without crashing the free MyMemory API
   */
  private async runInBatches<T>(items: any[], batchSize: number, fn: (item: any) => Promise<T>): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fn));
      results.push(...batchResults);
    }
    return results;
  }

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
      // Run sentence translations in parallel batches
      const translatedSentences = await this.runInBatches(sentences, 5, (sentence) =>
        this.queryMyMemory(sentence, from, to)
      );
      return translatedSentences.join(' ');
    }

    return this.queryMyMemory(trimmed, from, to);
  }

  private async queryMyMemory(query: string, from: string, to: string): Promise<string> {
    try {
      const pair = `${from.toLowerCase()}|${to.toLowerCase()}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${pair}`;
      
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000), // 6 seconds limit per request
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
    
    // Process all HTML tokens in batches of 5 concurrently!
    const results = await this.runInBatches(tokens, 5, async (tok) => {
      if (tok.startsWith('<') && tok.endsWith('>')) {
        // Retain HTML tag as-is
        return tok;
      } else if (tok.trim().length > 0) {
        return await this.translateSingle(tok, from, to);
      } else {
        return tok;
      }
    });

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

    // Execute field translations fully in parallel
    const promises = [];

    if (title) {
      promises.push(this.translateSingle(title, from, to).then(res => result.title = res));
    }
    if (excerpt) {
      promises.push(this.translateSingle(excerpt, from, to).then(res => result.excerpt = res));
    }
    if (content) {
      promises.push(this.translateHtml(content, from, to).then(res => result.content = res));
    }
    if (text) {
      promises.push(this.translateSingle(text, from, to).then(res => result.translatedText = res));
    }

    await Promise.all(promises);

    return result;
  }
}
