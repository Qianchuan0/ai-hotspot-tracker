import cron from 'node-cron';
import { all, get, run } from '../db.js';
import { TwitterCollector } from './twitter.js';
import { WebSearchCollector } from './web-search.js';
import { HackerNewsCollector } from './hackernews.js';
import { GithubTrendingCollector } from './github-trending.js';
import { RSSCollector } from './rss.js';
import { pushEvent } from '../routes/events.js';
import crypto from 'crypto';

// 所有采集器实例
const collectors = {
  twitter: new TwitterCollector(),
  web_search: new WebSearchCollector(),
  hn: new HackerNewsCollector(),
  github: new GithubTrendingCollector(),
  rss: new RSSCollector(),
};

// 采集任务配置
const SCHEDULES = [
  { name: 'twitter', collector: 'twitter', cron: '*/30 * * * *' },   // 每30分钟
  { name: 'web_search', collector: 'web_search', cron: '*/30 * * * *' }, // 每30分钟
  { name: 'hn', collector: 'hn', cron: '*/15 * * * *' },             // 每15分钟
  { name: 'github', collector: 'github', cron: '0 * * * *' },        // 每小时
  { name: 'rss', collector: 'rss', cron: '*/20 * * * *' },           // 每20分钟
];

let tasks = [];

/**
 * 启动所有采集任务
 */
export function startScheduler() {
  console.log('[Scheduler] Starting all collectors...');

  for (const schedule of SCHEDULES) {
    const collector = collectors[schedule.collector];
    if (!collector) continue;

    const task = cron.schedule(schedule.cron, () => {
      runCollectCycle(collector, schedule.name);
    }, {
      scheduled: true,
      runOnInit: false,
    });

    tasks.push(task);
    console.log(`[Scheduler] ${schedule.name}: ${schedule.cron}`);
  }

  // 启动后立即跑一轮
  setTimeout(() => runAllOnce(), 3000);
}

/**
 * 停止所有采集任务
 */
export function stopScheduler() {
  for (const task of tasks) {
    task.stop();
  }
  tasks = [];
  console.log('[Scheduler] Stopped all collectors');
}

/**
 * 立即执行一轮全部采集
 */
export async function runAllOnce() {
  console.log('[Scheduler] Running immediate collection cycle...');
  const entries = Object.entries(collectors);
  await Promise.allSettled(
    entries.map(([name, collector]) => runCollectCycle(collector, name))
  );

  // 采集完成后自动触发AI分析
  try {
    const { analyzeUnanalyzed } = await import('../ai/analyzer.js');
    await analyzeUnanalyzed();
  } catch (err) {
    console.error('[Scheduler] AI analysis failed:', err.message);
  }
}

/**
 * 执行一次采集周期
 */
async function runCollectCycle(collector, name) {
  try {
    // 获取活跃关键词
    const keywords = all('SELECT word FROM keywords WHERE is_active = 1');
    const keywordList = keywords.map(k => k.word);

    console.log(`[Scheduler] Running ${name} with ${keywordList.length} keywords`);

    const items = await collector.collect({ keywords: keywordList });
    console.log(`[Scheduler] ${name}: collected ${items.length} items`);

    // 存入数据库
    let newCount = 0;
    for (const item of items) {
      const added = await saveItem(item);
      if (added) newCount++;
    }

    if (newCount > 0) {
      console.log(`[Scheduler] ${name}: ${newCount} new items saved`);
    }
  } catch (err) {
    console.error(`[Scheduler] ${name} error:`, err.message);
  }
}

/**
 * 保存采集项到数据库（去重）
 */
async function saveItem(item) {
  const urlHash = crypto.createHash('sha256').update(item.url || item.id).digest('hex');

  // 检查是否已存在
  const existing = get('SELECT id FROM hotspots WHERE url_hash = ?', [urlHash]);
  if (existing) return false;

  try {
    run(
      `INSERT INTO hotspots (url_hash, title, url, source, raw_content, raw_metadata, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        urlHash,
        item.title,
        item.url,
        item.source,
        item.content,
        JSON.stringify(item.rawMetadata || {}),
        item.publishedAt || Math.floor(Date.now() / 1000),
      ]
    );

    // 推送SSE事件
    pushEvent('new_hotspot', {
      id: urlHash,
      title: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt,
    });

    return true;
  } catch (err) {
    // 可能是并发插入同一项
    return false;
  }
}
