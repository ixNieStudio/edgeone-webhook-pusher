import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { PushContentFormat } from '../types/app-config.js';

const SUMMARY_LENGTH = 120;
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'pre',
    'code',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'');
}

function collapseWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const html = await marked.parse(markdown, { async: false, breaks: true });
  return sanitizeHtml(typeof html === 'string' ? html : String(html), SANITIZE_OPTIONS);
}

function stripHtmlToText(html: string): string {
  const text = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return collapseWhitespace(decodeEntities(text));
}

class RichContentService {
  async render(body: string, format: PushContentFormat): Promise<string> {
    const safeBody = body?.trim() || '';
    if (!safeBody) {
      return '<p class="text-subtle">暂无详细内容</p>';
    }

    if (format === 'html') {
      return sanitizeHtml(safeBody, SANITIZE_OPTIONS);
    }

    if (format === 'markdown') {
      return renderMarkdownToHtml(safeBody);
    }

    return `<div class="whitespace-pre-wrap break-words">${escapeHtml(safeBody)}</div>`;
  }

  async toPlainText(body: string, format: PushContentFormat): Promise<string> {
    const safeBody = body?.trim() || '';
    if (!safeBody) {
      return '';
    }

    if (format === 'text') {
      return collapseWhitespace(safeBody);
    }

    const rendered = await this.render(safeBody, format);
    return stripHtmlToText(rendered);
  }

  async autoSummary(title: string, body: string, format: PushContentFormat): Promise<string> {
    const base = await this.toPlainText(body, format);
    if (!base) {
      return title.trim();
    }

    if (base.length <= SUMMARY_LENGTH) {
      return base;
    }

    return `${base.slice(0, SUMMARY_LENGTH - 1)}…`;
  }
}

export const richContentService = new RichContentService();
