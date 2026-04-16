import { BaseCollector } from './base.js';
import * as cheerio from 'cheerio';

/**
 * GitHub Trending 采集器 — 获取热门开源项目
 */
export class GithubTrendingCollector extends BaseCollector {
  constructor() {
    super('github');
  }

  async collect(options = {}) {
    try {
      const url = 'https://github.com/trending?since=daily';
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const html = await resp.text();
      return this.parseTrending(html);
    } catch (err) {
      console.error('[GitHub] Collect failed:', err.message);
      return [];
    }
  }

  parseTrending(html) {
    const $ = cheerio.load(html);
    const items = [];

    $('article.Box-row').each((_, el) => {
      const $el = $(el);

      // 项目名
      const nameEl = $el.find('h2 a');
      const name = nameEl.attr('href')?.replace(/^\//, '') || '';
      if (!name) return;

      // 描述
      const desc = $el.find('p').text().trim();

      // 语言
      const lang = $el.find('[itemprop="programmingLanguage"]').text().trim();

      // 今日star数
      const todayStars = $el.find('.float-sm-right').text().trim();

      // 总star数
      const starsLink = $el.find('a[href$="/stargazers"]');
      const stars = starsLink.text().trim();

      items.push({
        id: `github_${name.replace('/', '_')}`,
        source: 'github',
        title: `${name}${desc ? ' - ' + desc : ''}`,
        url: `https://github.com/${name}`,
        content: desc || `${name} trending repository`,
        author: name.split('/')[0] || null,
        publishedAt: Math.floor(Date.now() / 1000),
        rawMetadata: {
          type: 'github_trending',
          repo: name,
          description: desc,
          language: lang,
          stars: stars,
          todayStars: todayStars,
        },
      });
    });

    return items.slice(0, 25);
  }
}
