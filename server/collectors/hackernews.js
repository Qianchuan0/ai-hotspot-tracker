import { BaseCollector } from './base.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

/**
 * HackerNews 采集器 — 获取热门技术讨论
 */
export class HackerNewsCollector extends BaseCollector {
  constructor() {
    super('hn');
  }

  async collect(options = {}) {
    try {
      // 获取 Top Stories ID 列表
      const resp = await fetch(`${HN_API}/topstories.json`, {
        signal: AbortSignal.timeout(10000),
      });
      const ids = await resp.json();

      // 取前30条
      const topIds = ids.slice(0, 30);
      const items = [];

      // 批量获取详情（每次5个并发）
      for (let i = 0; i < topIds.length; i += 5) {
        const batch = topIds.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(id => this.fetchItem(id))
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            items.push(result.value);
          }
        }
      }

      return items;
    } catch (err) {
      console.error('[HN] Collect failed:', err.message);
      return [];
    }
  }

  async fetchItem(id) {
    const resp = await fetch(`${HN_API}/item/${id}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    const item = await resp.json();

    if (!item || item.deleted || item.dead) return null;

    // 只关注 story 和 job 类型
    if (item.type !== 'story') return null;

    return {
      id: `hn_${item.id}`,
      source: 'hn',
      title: item.title || '',
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      content: item.text || item.title || '',
      author: item.by || null,
      publishedAt: item.time || Math.floor(Date.now() / 1000),
      rawMetadata: {
        type: 'hn_story',
        score: item.score || 0,
        descendants: item.descendants || 0,
        kids: (item.kids || []).length,
      },
    };
  }
}
