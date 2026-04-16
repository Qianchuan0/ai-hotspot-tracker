import { BaseCollector } from './base.js';
import * as cheerio from 'cheerio';

// 多个搜索引擎备选（优先用RSS/XML格式，更容易解析）
const SEARCH_ENGINES = [
  {
    name: 'bing_news',
    buildUrl: (query) => `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`,
    parseResults: parseBingNews,
  },
  {
    name: 'google_news',
    buildUrl: (query) => `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`,
    parseResults: parseGoogleNewsRSS,
  },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
];

// 请求间隔追踪
let lastRequestTime = 0;
const MIN_INTERVAL = 30000; // 30秒间隔

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function throttledFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL) {
    const wait = MIN_INTERVAL - elapsed;
    console.log(`[WebSearch] Throttling: waiting ${Math.ceil(wait / 1000)}s`);
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();

  const resp = await fetch(url, {
    headers: {
      'User-Agent': getRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

/**
 * 网页搜索采集器 — 通过搜索引擎发现最新报道
 */
export class WebSearchCollector extends BaseCollector {
  constructor() {
    super('web_search');
  }

  async collect(options = {}) {
    const keywords = options.keywords || [];
    if (keywords.length === 0) return [];

    const allItems = [];

    for (const keyword of keywords) {
      for (const engine of SEARCH_ENGINES) {
        try {
          const url = engine.buildUrl(keyword);
          const html = await throttledFetch(url);
          const items = engine.parseResults(html, keyword);

          if (items.length > 0) {
            allItems.push(...items);
            break; // 一个引擎有结果就不试下一个
          }
        } catch (err) {
          console.error(`[WebSearch] ${engine.name} failed for "${keyword}":`, err.message);
        }
      }
    }

    return allItems;
  }
}

/**
 * 解析 Google News RSS 结果
 */
function parseGoogleNewsRSS(xml, keyword) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];

  $('item').each((_, el) => {
    const title = $(el).find('title').text().trim();
    const link = $(el).find('link').text().trim();
    const pubDate = $(el).find('pubDate').text().trim();
    const description = $(el).find('description').text().trim();
    const source = $(el).find('source').text().trim();

    if (!title || !link) return;

    items.push({
      id: `web_google_${hashString(link)}`,
      source: 'web_search',
      title: title.slice(0, 200),
      url: link,
      content: cleanHtml(description || title).slice(0, 500),
      author: source || null,
      publishedAt: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000),
      rawMetadata: {
        type: 'google_news_rss',
        matchedKeyword: keyword,
        sourceName: source,
      },
    });
  });

  return items.slice(0, 10);
}

/**
 * 解析 Bing News RSS 结果
 */
function parseBingNews(xml, keyword) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];

  $('item').each((_, el) => {
    const title = $(el).find('title').text().trim();
    const link = $(el).find('link').text().trim();
    const pubDate = $(el).find('pubDate').text().trim();
    const description = $(el).find('description').text().trim();

    if (!title || !link) return;

    items.push({
      id: `web_bing_${hashString(link)}`,
      source: 'web_search',
      title: title.slice(0, 200),
      url: link,
      content: cleanHtml(description || title).slice(0, 500),
      author: null,
      publishedAt: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000),
      rawMetadata: {
        type: 'bing_news_rss',
        matchedKeyword: keyword,
      },
    });
  });

  return items.slice(0, 10);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function cleanHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}
