import { BaseCollector } from './base.js';
import Parser from 'rss-parser';

const DEFAULT_RSS_SOURCES = [
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/feed.xml' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
];

/**
 * RSS 采集器 — 聚合多个博客/新闻源
 */
export class RSSCollector extends BaseCollector {
  constructor() {
    super('rss');
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIHotspotTracker/1.0)',
      },
    });
  }

  async collect(options = {}) {
    const sources = options.rssSources || DEFAULT_RSS_SOURCES;
    const allItems = [];

    for (const source of sources) {
      try {
        const feed = await this.parser.parseURL(source.url);
        const items = (feed.items || []).slice(0, 5).map(item => ({
          id: `rss_${hashString(item.link || item.guid || item.title)}`,
          source: 'rss',
          title: item.title || '',
          url: item.link || '',
          content: (item.contentSnippet || item.content || item.title || '').slice(0, 500),
          author: item.creator || source.name,
          publishedAt: item.pubDate
            ? Math.floor(new Date(item.pubDate).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          rawMetadata: {
            type: 'rss',
            feedName: source.name,
            feedUrl: source.url,
            categories: item.categories || [],
          },
        }));

        allItems.push(...items);
      } catch (err) {
        console.error(`[RSS] Failed to fetch ${source.name}:`, err.message);
      }
    }

    return allItems;
  }
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
