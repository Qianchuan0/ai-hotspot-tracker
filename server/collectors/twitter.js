import { BaseCollector } from './base.js';

const API_BASE = 'https://api.twitterapi.io';

/**
 * Twitter/X 采集器 — 通过 twitterapi.io 获取推文和趋势
 */
export class TwitterCollector extends BaseCollector {
  constructor() {
    super('twitter');
  }

  get apiKey() { return process.env.TWITTER_API_KEY; }

  /**
   * 搜索关键词相关推文
   * @param {object} options
   * @param {string[]} options.keywords - 搜索关键词
   * @param {number} [options.sinceTime] - 只获取此时间之后的推文
   * @returns {Promise<RawItem[]>}
   */
  async collect(options = {}) {
    if (!this.apiKey) {
      console.warn('[Twitter] TWITTER_API_KEY not set, skipping');
      return [];
    }

    const allItems = [];
    const keywords = options.keywords || [];
    const sinceTime = options.sinceTime || Math.floor(Date.now() / 1000) - 1800; // 默认30分钟内

    // 按关键词搜索推文
    for (const keyword of keywords) {
      try {
        const items = await this.searchTweets(keyword, sinceTime);
        allItems.push(...items);
      } catch (err) {
        console.error(`[Twitter] Search failed for "${keyword}":`, err.message);
      }
    }

    // 同时获取全球趋势
    try {
      const trends = await this.getTrends();
      allItems.push(...trends);
    } catch (err) {
      console.error('[Twitter] Trends failed:', err.message);
    }

    return allItems;
  }

  /**
   * 搜索推文
   */
  async searchTweets(keyword, sinceTime) {
    const query = `"${keyword}" since_time:${sinceTime}`;
    const url = `${API_BASE}/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Latest`;

    const resp = await fetch(url, {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!resp.ok) {
      throw new Error(`API returned ${resp.status}`);
    }

    const data = await resp.json();
    if (!data.tweets || data.tweets.length === 0) return [];

    return data.tweets
      .filter(t => t.type === 'tweet') // 过滤掉转推等
      .map(tweet => this.normalizeTweet(tweet, keyword));
  }

  /**
   * 获取全球热门趋势
   */
  async getTrends() {
    const url = `${API_BASE}/twitter/trends?woeid=1`; // woeid=1 表示全球
    const resp = await fetch(url, {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!resp.ok) {
      throw new Error(`Trends API returned ${resp.status}`);
    }

    const data = await resp.json();
    if (!data.trends) return [];

    return data.trends
      .slice(0, 10)
      .map(trend => ({
        id: `twitter_trend_${trend.name}`,
        source: 'twitter',
        title: trend.name,
        url: `https://twitter.com/search?q=${encodeURIComponent(trend.name)}`,
        content: trend.meta_description || `Twitter Trending #${trend.rank}`,
        author: null,
        publishedAt: Math.floor(Date.now() / 1000),
        rawMetadata: {
          type: 'trend',
          rank: trend.rank,
          query: trend.target?.query,
        },
      }));
  }

  /**
   * 标准化推文数据
   */
  normalizeTweet(tweet, matchedKeyword) {
    const author = tweet.author || {};
    return {
      id: `twitter_${tweet.id}`,
      source: 'twitter',
      title: tweet.text ? tweet.text.slice(0, 200) : '',
      url: tweet.url || `https://twitter.com/i/web/status/${tweet.id}`,
      content: tweet.text || '',
      author: author.userName || null,
      publishedAt: tweet.createdAt ? Math.floor(new Date(tweet.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
      rawMetadata: {
        type: 'tweet',
        matchedKeyword,
        likeCount: tweet.likeCount || 0,
        retweetCount: tweet.retweetCount || 0,
        replyCount: tweet.replyCount || 0,
        viewCount: tweet.viewCount || 0,
        quoteCount: tweet.quoteCount || 0,
        bookmarkCount: tweet.bookmarkCount || 0,
        lang: tweet.lang,
        authorVerified: author.isBlueVerified || false,
        authorFollowers: author.followers || 0,
      },
    };
  }
}
