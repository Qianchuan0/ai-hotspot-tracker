// 测试 Twitter 采集器
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '..', '.env') });

import { TwitterCollector } from './twitter.js';

async function test() {
  const collector = new TwitterCollector();

  console.log('[Test] Testing Twitter collector...');

  // 测试搜索
  const items = await collector.collect({
    keywords: ['AI', 'GPT'],
    sinceTime: Math.floor(Date.now() / 1000) - 3600, // 最近1小时
  });

  console.log(`[Test] Collected ${items.length} items`);
  items.slice(0, 3).forEach((item, i) => {
    console.log(`\n--- Item ${i + 1} ---`);
    console.log(`Source: ${item.source}`);
    console.log(`Title: ${item.title.slice(0, 80)}...`);
    console.log(`Author: ${item.author}`);
    console.log(`URL: ${item.url}`);
    console.log(`Metadata:`, JSON.stringify(item.rawMetadata, null, 2).slice(0, 200));
  });
}

test().catch(err => {
  console.error('[Test] Failed:', err.message);
  process.exit(1);
});
