import { all, get, run } from '../db.js';
import { pushEvent } from '../routes/events.js';

/**
 * 通知服务 — 处理关键词匹配通知和高热度通知
 */
export async function processNotifications() {
  // 获取最近分析过但还没处理通知的热点
  const recentAnalyzed = all(`
    SELECT h.*, hk.keyword_id, hk.relevance_score
    FROM hotspots h
    JOIN hotspot_keywords hk ON h.id = hk.hotspot_id
    WHERE h.ai_analyzed_at > 0
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.hotspot_id = h.id AND n.keyword_id = hk.keyword_id
    )
    ORDER BY h.ai_analyzed_at DESC
    LIMIT 50
  `);

  let notifyCount = 0;

  for (const item of recentAnalyzed) {
    const minRelevance = parseFloat(process.env.NOTIFICATION_MIN_RELEVANCE || '0.7');

    if (item.relevance_score >= minRelevance) {
      await createNotification(item, 'keyword_match');
      notifyCount++;
    }
  }

  // 高热度通知（无需关键词匹配）
  const highHeat = all(`
    SELECT * FROM hotspots
    WHERE ai_analyzed_at > 0
    AND heat_score >= 8.0
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.hotspot_id = hotspots.id AND n.type = 'high_heat'
    )
    LIMIT 10
  `);

  for (const item of highHeat) {
    await createNotification(item, 'high_heat');
    notifyCount++;
  }

  if (notifyCount > 0) {
    console.log(`[Notifier] Created ${notifyCount} notifications`);
  }
}

async function createNotification(item, type) {
  const title = type === 'keyword_match'
    ? `关键词匹配: ${item.title?.slice(0, 80)}`
    : `高热度: ${item.title?.slice(0, 80)}`;

  run(
    `INSERT INTO notifications (hotspot_id, keyword_id, type, title, body) VALUES (?, ?, ?, ?, ?)`,
    [
      item.id || item.hotspot_id,
      item.keyword_id || null,
      type,
      title,
      item.summary || '',
    ]
  );

  // SSE 推送
  pushEvent('notification', {
    type,
    hotspotId: item.id || item.hotspot_id,
    title: title,
    summary: item.summary || '',
    source: item.source,
    heatScore: item.heat_score,
    credibility: item.credibility,
  });
}
