/**
 * AI Hotspot Tracker — MCP Server
 *
 * 将热点追踪能力封装为 MCP Tools，供 Claude Desktop / Cursor 等支持 MCP 的 AI 客户端调用。
 *
 * 配置示例（claude_desktop_config.json）：
 * {
 *   "mcpServers": {
 *     "ai-hotspot-tracker": {
 *       "command": "node",
 *       "args": ["skills/mcp-server.js"],
 *       "cwd": "D:/AiProgram/mine/ai-hotspot-tracker",
 *       "env": {
 *         "OPENROUTER_API_KEY": "your-key",
 *         "TWITTER_API_KEY": "your-key"
 *       }
 *     }
 *   }
 * }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载 .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// 导入核心模块
import { initDB, all, get, run } from '../server/db.js';
import { triggerAnalysis } from '../server/ai/analyzer.js';
import { TwitterCollector } from '../server/collectors/twitter.js';
import { HackerNewsCollector } from '../server/collectors/hackernews.js';
import { GithubTrendingCollector } from '../server/collectors/github-trending.js';
import { RSSCollector } from '../server/collectors/rss.js';
import crypto from 'crypto';

// 创建 MCP Server
const server = new McpServer({
  name: 'ai-hotspot-tracker',
  version: '1.0.0',
});

// =============================================
// Tool 1: track_keywords — 添加/管理关键词监控
// =============================================
server.tool(
  'track_keywords',
  '管理关键词监控。可以添加新的关键词来追踪AI领域特定话题，或列出当前所有监控关键词。',
  {
    action: z.enum(['add', 'list', 'remove']).describe('操作类型：add=添加关键词，list=列出所有关键词，remove=删除关键词'),
    keyword: z.string().optional().describe('要添加或删除的关键词（add/remove时必填）'),
  },
  async ({ action, keyword }) => {
    if ((action === 'add' || action === 'remove') && !keyword) {
      return { content: [{ type: 'text', text: '错误：add/remove 操作需要提供 keyword 参数' }] };
    }

    if (action === 'add') {
      const existing = get('SELECT * FROM keywords WHERE word = ?', [keyword]);
      if (existing) {
        // 如果已存在但被暂停了，恢复它
        if (!existing.is_active) {
          run('UPDATE keywords SET is_active = 1 WHERE id = ?', [existing.id]);
          return { content: [{ type: 'text', text: `关键词 "${keyword}" 已重新激活` }] };
        }
        return { content: [{ type: 'text', text: `关键词 "${keyword}" 已在监控中` }] };
      }
      run('INSERT INTO keywords (word) VALUES (?)', [keyword]);
      return { content: [{ type: 'text', text: `已开始监控关键词: "${keyword}"` }] };
    }

    if (action === 'remove') {
      const existing = get('SELECT * FROM keywords WHERE word = ?', [keyword]);
      if (!existing) {
        return { content: [{ type: 'text', text: `关键词 "${keyword}" 不存在` }] };
      }
      run('DELETE FROM hotspot_keywords WHERE keyword_id = ?', [existing.id]);
      run('DELETE FROM keywords WHERE id = ?', [existing.id]);
      return { content: [{ type: 'text', text: `已移除关键词: "${keyword}"` }] };
    }

    // list
    const keywords = all('SELECT * FROM keywords ORDER BY created_at DESC');
    if (keywords.length === 0) {
      return { content: [{ type: 'text', text: '当前没有任何监控关键词。使用 action:"add" 添加。' }] };
    }
    const list = keywords.map(k =>
      `- "${k.word}" (ID:${k.id}, ${k.is_active ? '活跃' : '暂停'})`
    ).join('\n');
    return { content: [{ type: 'text', text: `当前监控关键词 (${keywords.length}个):\n${list}` }] };
  }
);

// =============================================
// Tool 2: get_trending — 获取当前热点
// =============================================
server.tool(
  'get_trending',
  '获取AI领域当前热点话题。从本地数据库中查询已采集和分析的热点内容。',
  {
    category: z.string().optional().describe('按来源筛选：twitter / hn / github / rss / web_search'),
    limit: z.number().optional().describe('返回数量，默认10'),
    min_heat: z.number().optional().describe('最低热度分数(1-10)，默认5'),
  },
  async ({ category, limit = 10, min_heat = 5 }) => {
    const conditions = ['h.ai_analyzed_at > 0'];
    const params = [];

    if (category) {
      conditions.push('h.source = ?');
      params.push(category);
    }
    if (min_heat > 0) {
      conditions.push('h.heat_score >= ?');
      params.push(min_heat);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const hotspots = all(
      `SELECT h.* FROM hotspots h ${where} ORDER BY h.heat_score DESC LIMIT ?`,
      [...params, limit]
    );

    if (hotspots.length === 0) {
      // 如果没有AI分析过的数据，返回原始采集数据
      const raw = all(
        `SELECT * FROM hotspots ORDER BY collected_at DESC LIMIT ?`,
        [limit]
      );
      if (raw.length === 0) {
        return { content: [{ type: 'text', text: '暂无热点数据。可能还未进行采集或API Key未配置。' }] };
      }
      const text = raw.map((h, i) =>
        `${i + 1}. [${h.source}] ${h.title}\n   ${h.url}\n   采集时间: ${new Date(h.collected_at * 1000).toLocaleString('zh-CN')}`
      ).join('\n\n');
      return { content: [{ type: 'text', text: `最近采集的热点 (未经AI分析):\n\n${text}` }] };
    }

    const text = hotspots.map((h, i) => {
      const heat = h.heat_score ? ` 热度:${h.heat_score.toFixed(1)}` : '';
      const cred = h.credibility ? ` 可信度:${h.credibility}` : '';
      const summary = h.summary ? `\n   摘要: ${h.summary}` : '';
      return `${i + 1}. [${h.source}]${heat}${cred}\n   ${h.title}\n   ${h.url}${summary}`;
    }).join('\n\n');

    return { content: [{ type: 'text', text: `当前AI领域热点 (共${hotspots.length}条):\n\n${text}` }] };
  }
);

// =============================================
// Tool 3: check_credibility — 信息真伪核查
// =============================================
server.tool(
  'check_credibility',
  '检查一条AI相关信息的可信度。利用已采集的多源数据进行交叉验证，并调用AI进行推理判断。',
  {
    claim: z.string().describe('要核查的信息/消息描述'),
    source_url: z.string().optional().describe('信息来源URL（可选）'),
  },
  async ({ claim, source_url }) => {
    // 先在本地数据库中搜索相关内容
    const keywords = claim.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
    const likeConditions = keywords.map(() => 'h.title LIKE ?').join(' OR ');
    const likeParams = keywords.map(w => `%${w}%`);

    let related = [];
    if (likeConditions) {
      related = all(
        `SELECT h.* FROM hotspots h WHERE (${likeConditions}) ORDER BY h.heat_score DESC LIMIT 5`,
        likeParams
      );
    }

    // 如果有URL，直接查找
    if (source_url) {
      const urlHash = crypto.createHash('sha256').update(source_url).digest('hex');
      const directMatch = get('SELECT * FROM hotspots WHERE url_hash = ?', [urlHash]);
      if (directMatch) {
        related.unshift(directMatch);
      }
    }

    let result = `信息核查: "${claim}"\n\n`;

    if (related.length > 0) {
      result += `在本地数据库中找到 ${related.length} 条相关内容:\n\n`;
      related.forEach((h, i) => {
        const cred = h.credibility ? `可信度: ${h.credibility} (${h.credibility_score?.toFixed(2) || 'N/A'})` : '未分析';
        const heat = h.heat_score ? `热度: ${h.heat_score.toFixed(1)}` : '';
        result += `${i + 1}. [${h.source}] ${cred} ${heat}\n   ${h.title}\n`;
        if (h.summary) result += `   AI摘要: ${h.summary}\n`;
        if (h.warning) result += `   ⚠️ 警告: ${h.warning}\n`;
        result += '\n';
      });
    } else {
      result += '本地数据库中未找到相关内容。\n';
    }

    // 如果有 OpenRouter Key，调用 AI 进行推理
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const { callReasoningModel } = await import('../server/ai/client.js');
        const { CREDIBILITY_SYSTEM, CREDIBILITY_USER } = await import('../server/ai/prompts.js');

        const aiResult = await callReasoningModel(
          CREDIBILITY_SYSTEM,
          `核查信息: ${claim}\n来源: ${source_url || '未知'}\n\n本地相关数据:\n${related.map(h => `- [${h.source}] ${h.title} (可信度:${h.credibility || '未知'})`).join('\n')}`
        );

        result += `--- AI 推理判断 ---\n${aiResult}`;
      } catch (e) {
        result += `(AI 推理失败: ${e.message})`;
      }
    } else {
      result += '(未配置 OPENROUTER_API_KEY，无法进行AI推理分析)';
    }

    return { content: [{ type: 'text', text: result }] };
  }
);

// =============================================
// Tool 4: get_keyword_matches — 查询关键词匹配结果
// =============================================
server.tool(
  'get_keyword_matches',
  '查询特定关键词的最近匹配结果，返回与该关键词相关联的热点内容。',
  {
    keyword: z.string().describe('要查询的关键词'),
    since_hours: z.number().optional().describe('查询最近N小时的结果，默认24'),
  },
  async ({ keyword, since_hours = 24 }) => {
    const sinceTime = Math.floor(Date.now() / 1000) - (since_hours * 3600);

    // 先找关键词
    const kw = get('SELECT * FROM keywords WHERE word = ?', [keyword]);
    if (!kw) {
      return { content: [{ type: 'text', text: `关键词 "${keyword}" 不在监控列表中。先使用 track_keywords 添加。` }] };
    }

    // 查询关联的热点
    const matches = all(
      `SELECT h.*, hk.relevance_score
       FROM hotspots h
       JOIN hotspot_keywords hk ON h.id = hk.hotspot_id
       WHERE hk.keyword_id = ?
       AND h.collected_at >= ?
       ORDER BY hk.relevance_score DESC
       LIMIT 20`,
      [kw.id, sinceTime]
    );

    if (matches.length === 0) {
      // 尝试用 LIKE 模糊搜索
      const fuzzy = all(
        `SELECT * FROM hotspots WHERE title LIKE ? AND collected_at >= ? ORDER BY collected_at DESC LIMIT 10`,
        [`%${keyword}%`, sinceTime]
      );

      if (fuzzy.length === 0) {
        return { content: [{ type: 'text', text: `关键词 "${keyword}" 在最近 ${since_hours} 小时内没有匹配结果。` }] };
      }

      const text = fuzzy.map((h, i) =>
        `${i + 1}. [${h.source}] ${h.title}\n   ${h.url}\n   ${new Date(h.collected_at * 1000).toLocaleString('zh-CN')}`
      ).join('\n\n');

      return { content: [{ type: 'text', text: `"${keyword}" 模糊匹配结果 (最近${since_hours}h, ${fuzzy.length}条):\n\n${text}` }] };
    }

    const text = matches.map((h, i) => {
      const rel = h.relevance_score ? `相关度: ${(h.relevance_score * 100).toFixed(0)}%` : '';
      const heat = h.heat_score ? ` 热度: ${h.heat_score.toFixed(1)}` : '';
      const cred = h.credibility ? ` 可信度: ${h.credibility}` : '';
      const summary = h.summary ? `\n   摘要: ${h.summary}` : '';
      return `${i + 1}. [${h.source}] ${rel}${heat}${cred}\n   ${h.title}\n   ${h.url}${summary}`;
    }).join('\n\n');

    return { content: [{ type: 'text', text: `"${keyword}" 匹配结果 (最近${since_hours}h, ${matches.length}条):\n\n${text}` }] };
  }
);

// =============================================
// Tool 5: collect_now — 立即执行一轮采集
// =============================================
server.tool(
  'collect_now',
  '立即触发一轮数据采集，从所有配置的数据源获取最新内容。',
  {},
  async () => {
    const results = [];
    const collectors = [
      { name: 'Twitter/X', collector: new TwitterCollector() },
      { name: 'HackerNews', collector: new HackerNewsCollector() },
      { name: 'GitHub Trending', collector: new GithubTrendingCollector() },
      { name: 'RSS', collector: new RSSCollector() },
    ];

    const keywords = all('SELECT word FROM keywords WHERE is_active = 1');
    const keywordList = keywords.map(k => k.word);

    for (const { name, collector } of collectors) {
      try {
        const items = await collector.collect({ keywords: keywordList });
        let saved = 0;
        for (const item of items) {
          const urlHash = crypto.createHash('sha256').update(item.url || item.id).digest('hex');
          const existing = get('SELECT id FROM hotspots WHERE url_hash = ?', [urlHash]);
          if (!existing) {
            try {
              run(
                `INSERT INTO hotspots (url_hash, title, url, source, raw_content, raw_metadata, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [urlHash, item.title, item.url, item.source, item.content, JSON.stringify(item.rawMetadata || {}), item.publishedAt || Math.floor(Date.now() / 1000)]
              );
              saved++;
            } catch {}
          }
        }
        results.push(`${name}: 采集 ${items.length} 条, 新增 ${saved} 条`);
      } catch (e) {
        results.push(`${name}: 失败 - ${e.message}`);
      }
    }

    // 触发 AI 分析
    let analysisResult = '';
    if (process.env.OPENROUTER_API_KEY) {
      try {
        await triggerAnalysis();
        analysisResult = '\n\nAI 分析已完成';
      } catch (e) {
        analysisResult = `\n\nAI 分析失败: ${e.message}`;
      }
    }

    return { content: [{ type: 'text', text: `采集完成:\n${results.join('\n')}${analysisResult}` }] };
  }
);

// =============================================
// 启动 MCP Server
// =============================================
async function main() {
  // 初始化数据库
  await initDB();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] AI Hotspot Tracker MCP Server running on stdio');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
