import { callFastModel, callFastJSON, callReasoningModel } from './client.js';
import { SUMMARY_SYSTEM, SUMMARY_USER, MATCH_SYSTEM, MATCH_USER, CREDIBILITY_SYSTEM, CREDIBILITY_USER, HEAT_SYSTEM, HEAT_USER } from './prompts.js';
import { get, all, run } from '../db.js';

/**
 * 分析管道：对未分析的热点内容执行AI分析
 */
export async function analyzeUnanalyzed() {
  if (!process.env.GLM_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    console.warn('[AI] No AI API keys set, skipping analysis');
    return;
  }

  // 获取未分析的内容
  const items = all('SELECT * FROM hotspots WHERE ai_analyzed_at IS NULL ORDER BY collected_at DESC LIMIT 10');

  if (items.length === 0) {
    console.log('[AI] No unanalyzed items');
    return;
  }

  console.log(`[AI] Analyzing ${items.length} items...`);

  for (const item of items) {
    try {
      await analyzeItem(item);
    } catch (err) {
      console.error(`[AI] Failed to analyze item ${item.id}:`, err.message);
      // 标记为已尝试（避免重复失败）
      run('UPDATE hotspots SET ai_analyzed_at = -1 WHERE id = ?', [item.id]);
    }
  }

  // 分析完成后处理通知
  try {
    const { processNotifications } = await import('../services/notifier.js');
    await processNotifications();
  } catch (err) {
    console.error('[AI] Notification processing failed:', err.message);
  }
}

/**
 * 分析单个内容
 */
async function analyzeItem(item) {
  const metadata = JSON.parse(item.raw_metadata || '{}');

  // Step 1: 生成摘要
  let summary = null;
  try {
    summary = await callFastModel(
      SUMMARY_SYSTEM,
      SUMMARY_USER(item.title, item.raw_content, item.source)
    );
  } catch (err) {
    console.error(`[AI] Summary failed for ${item.id}:`, err.message);
  }

  // Step 2: 关键词匹配
  const keywords = all('SELECT * FROM keywords WHERE is_active = 1');
  let matches = [];
  if (keywords.length > 0 && summary) {
    try {
      const result = await callFastJSON(
        MATCH_SYSTEM,
        MATCH_USER(item.title, summary, keywords.map(k => k.word))
      );
      matches = result?.matches || [];
    } catch (err) {
      console.error(`[AI] Match failed for ${item.id}:`, err.message);
    }
  }

  // Step 3: 真伪评估（使用推理模型）
  let credibility = 'medium';
  let credibilityScore = 0.5;
  let warning = '';
  try {
    const credResult = await callReasoningModel(
      CREDIBILITY_SYSTEM,
      CREDIBILITY_USER(item.title, summary, item.source, metadata)
    );
    const parsed = JSON.parse(credResult.match(/\{[\s\S]*\}/)?.[0] || '{}');
    credibility = parsed.credibility || 'medium';
    credibilityScore = parsed.score || 0.5;
    warning = parsed.warning || '';
  } catch (err) {
    console.error(`[AI] Credibility failed for ${item.id}:`, err.message);
  }

  // Step 4: 热度评分
  let heatScore = 5.0;
  try {
    const heatResult = await callFastJSON(
      HEAT_SYSTEM,
      HEAT_USER(item.title, summary, item.source, metadata)
    );
    if (heatResult?.heat_score) {
      heatScore = Math.min(10, Math.max(1, heatResult.heat_score));
    }
  } catch (err) {
    console.error(`[AI] Heat score failed for ${item.id}:`, err.message);
  }

  // 更新数据库
  run(
    `UPDATE hotspots SET
      summary = ?,
      credibility = ?,
      credibility_score = ?,
      heat_score = ?,
      warning = ?,
      ai_analyzed_at = ?
    WHERE id = ?`,
    [summary, credibility, credibilityScore, heatScore, warning, Math.floor(Date.now() / 1000), item.id]
  );

  // 保存关键词匹配
  for (const match of matches) {
    if (match.score < 0.5) continue;
    const keyword = keywords.find(k => k.word === match.keyword);
    if (!keyword) continue;

    try {
      run(
        'INSERT OR IGNORE INTO hotspot_keywords (hotspot_id, keyword_id, relevance_score) VALUES (?, ?, ?)',
        [item.id, keyword.id, match.score]
      );
    } catch {}
  }

  console.log(`[AI] Analyzed item ${item.id}: heat=${heatScore.toFixed(1)} cred=${credibility} matches=${matches.length}`);
}

/**
 * 手动触发分析（API调用）
 */
export async function triggerAnalysis() {
  await analyzeUnanalyzed();
  return { status: 'completed' };
}
