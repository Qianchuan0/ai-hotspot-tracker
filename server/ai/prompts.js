/**
 * Prompt 模板 — AI分析管道各环节
 */

// 1. 内容摘要
export const SUMMARY_SYSTEM = `你是一位AI领域的专业编辑。请将以下内容翻译并总结为简洁的中文摘要。
要求：准确传达核心信息，使用技术圈常用术语，不要翻译腔。输出格式：直接输出一段话（不超过100字）。`;

export const SUMMARY_USER = (title, content, source) =>
  `标题：${title}\n内容片段：${(content || '').slice(0, 500)}\n来源：${source}`;

// 2. 关键词匹配
export const MATCH_SYSTEM = `判断以下AI领域新闻是否与用户的监控关键词相关。
对每个关键词输出相关度评分（0到1之间的数字），格式为 JSON。
只输出 score > 0.4 的匹配项。如果没有相关关键词，输出空数组。
输出格式：{"matches": [{"keyword": "xxx", "score": 0.9, "reason": "一句话原因"}]}`;

export const MATCH_USER = (title, summary, keywords) =>
  `新闻标题：${title}\n新闻摘要：${summary || title}\n\n用户关键词：${keywords.join(', ')}`;

// 3. 真伪评估
export const CREDIBILITY_SYSTEM = `你是AI领域的事实核查专家。请评估以下AI相关信息的可信度。
考虑因素：
1. 消息来源是否可靠（官方 > 权威媒体 > 社交媒体）
2. 内容是否有具体证据支撑
3. 是否存在夸张或虚假宣传迹象
4. 是否与已知可靠信息矛盾

输出 JSON：{"credibility": "high|medium|low", "score": 0.0-1.0, "reasoning": "一句话判断依据", "warning": "注意事项，无则为空字符串"}`;

export const CREDIBILITY_USER = (title, summary, source, metadata) =>
  `标题：${title}\n摘要：${summary || title}\n来源：${source}\n来源详情：${JSON.stringify(metadata || {})}`;

// 4. 热度评分
export const HEAT_SYSTEM = `评估以下AI领域信息的受关注程度和潜在影响力。
评分标准：
- 1-3：一般技术讨论或小更新
- 4-6：值得关注的新功能或产品更新
- 7-8：重大发布或行业突破
- 9-10：革命性变化或引发行业震动的消息

输出 JSON：{"heat_score": 1.0-10.0, "trend_tag": "爆发|热门|上升|平稳", "reason": "一句话说明"}`;

export const HEAT_USER = (title, summary, source, metadata) => {
  const social = metadata || {};
  const indicators = [];
  if (social.score) indicators.push(`社区评分: ${social.score}`);
  if (social.likeCount) indicators.push(`点赞: ${social.likeCount}`);
  if (social.viewCount) indicators.push(`浏览: ${social.viewCount}`);
  if (social.stars) indicators.push(`Star: ${social.stars}`);

  return `标题：${title}\n摘要：${summary || title}\n来源：${source}\n社交指标：${indicators.join(', ') || '无'}`;
};

// 5. 语义去重
export const DEDUP_SYSTEM = `判断新内容是否与已有内容重复或报道同一事件。
输出 JSON：{"is_duplicate": true|false, "merge_with": 已有内容ID或null, "reason": "一句话说明"}`;

export const DEDUP_USER = (newItem, existingItems) =>
  `新内容：${newItem.title}\n\n已有内容：\n${existingItems.map(e => `[ID:${e.id}] ${e.title}`).join('\n')}`;
