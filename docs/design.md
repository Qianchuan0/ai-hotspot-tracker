# AI Hotspot Tracker - 技术方案文档

## 1. 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| 运行时 | Node.js | >=18 |
| 后端框架 | Express | 4.x |
| 前端框架 | React + Vite | React 18, Vite 5 |
| 样式 | TailwindCSS | 3.x |
| 数据库 | SQLite (better-sqlite3) | - |
| AI平台 | OpenRouter (OpenAI SDK兼容) | - |
| Twitter | TwitterAPI.io | - |
| 定时任务 | node-cron | 3.x |
| HTML解析 | cheerio | 1.x |
| RSS解析 | rss-parser | 3.x |

## 2. 架构

```
┌─────────────────────────────────────────────┐
│          前端 (React + TailwindCSS)          │
│    雷达Canvas / 信号卡片 / 关键词管理 / 通知  │
└────────────┬──────────────┬─────────────────┘
             │ SSE          │ REST API
             ▼              ▼
┌─────────────────────────────────────────────┐
│             Express 路由层                   │
│  /api/keywords  /api/hotspots  /api/events   │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│             服务层                           │
│  MonitorService  NotifierService  DedupService│
└──┬──────────┬──────────────┬────────────────┘
   │          │              │
   ▼          ▼              ▼
┌────────┐ ┌──────────┐ ┌────────┐
│Collectors│ │AI Analyzer│ │ SQLite │
│(5个源)  │ │(OpenRouter)│ │        │
└────────┘ └──────────┘ └────────┘
```

## 3. 数据库设计

```sql
-- 关键词表
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  is_active INTEGER NOT NULL DEFAULT 1
);

-- 热点内容表
CREATE TABLE hotspots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,            -- 'twitter'|'web_search'|'hn'|'github'|'rss'
  summary TEXT,                    -- AI生成的摘要
  credibility TEXT,                -- 'high'|'medium'|'low'
  credibility_score REAL,          -- 0.0-1.0
  heat_score REAL,                 -- 1.0-10.0
  warning TEXT,                    -- AI警告信息
  raw_content TEXT,
  raw_metadata TEXT,               -- JSON: 社交指标等
  published_at INTEGER,
  collected_at INTEGER NOT NULL DEFAULT (unixepoch()),
  ai_analyzed_at INTEGER
);

-- 热点-关键词关联
CREATE TABLE hotspot_keywords (
  hotspot_id INTEGER REFERENCES hotspots(id),
  keyword_id INTEGER REFERENCES keywords(id),
  relevance_score REAL,
  PRIMARY KEY (hotspot_id, keyword_id)
);

-- 通知表
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotspot_id INTEGER REFERENCES hotspots(id),
  keyword_id INTEGER REFERENCES keywords(id),
  type TEXT NOT NULL,              -- 'keyword_match'|'high_heat'|'credibility_alert'
  title TEXT NOT NULL,
  body TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- RSS源配置
CREATE TABLE rss_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  last_collected_at INTEGER
);
```

## 4. API 接口设计

### 4.1 关键词管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/keywords | 获取所有关键词 |
| POST | /api/keywords | 添加关键词 `{ word }` |
| DELETE | /api/keywords/:id | 删除关键词 |
| PATCH | /api/keywords/:id | 更新关键词（暂停/恢复） |

### 4.2 热点查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/hotspots | 热点列表（支持分页、排序、筛选） |
| GET | /api/hotspots/:id | 热点详情 |

查询参数：
- `source` - 按来源筛选
- `min_heat` - 最低热度
- `credibility` - 可信度筛选
- `keyword` - 按关键词筛选
- `page`, `limit` - 分页
- `sort` - 排序方式（heat_desc, time_desc）

### 4.3 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/notifications | 通知列表 |
| PATCH | /api/notifications/:id | 标记已读 |
| POST | /api/notifications/read-all | 全部已读 |

### 4.4 实时推送

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/events | SSE 端点 |

事件类型：
- `new_hotspot` - 新热点
- `keyword_match` - 关键词匹配
- `notification` - 通知

## 5. 数据采集器接口

```javascript
// 统一接口
class BaseCollector {
  constructor(name) { this.name = name; }

  /**
   * @param {string} keyword - 搜索关键词（可选）
   * @returns {Promise<Array<RawItem>>}
   */
  async collect(keyword) { throw new Error('Not implemented'); }
}

// 标准返回格式
// RawItem = {
//   id: string,          // 唯一标识（用于去重）
//   source: string,      // 'twitter'|'web_search'|'hn'|'github'|'rss'
//   title: string,
//   url: string,
//   content: string,     // 正文/摘要片段
//   author: string|null,
//   publishedAt: number, // Unix时间戳
//   rawMetadata: object  // 源特有数据（如推文的likeCount等）
// }
```

## 6. AI 分析管道

### 6.1 分析流程

```
原始内容
  │
  ├─→ [1] 摘要生成 (GLM-4.7-Flash)
  │     输入：标题+内容 → 输出：3句中文摘要
  │
  ├─→ [2] 关键词匹配 (GLM-4.7-Flash)
  │     输入：摘要+关键词列表 → 输出：匹配项+相关度
  │
  ├─→ [3] 真伪评估 (DeepSeek R1)
  │     输入：标题+摘要+来源 → 输出：可信度+判断依据
  │
  ├─→ [4] 热度评分 (GLM-4.7-Flash)
  │     输入：标题+摘要+社交指标 → 输出：1-10分
  │
  └─→ [5] 语义去重 (GLM-4.7-Flash)
        输入：新内容 vs 近24h内容 → 输出：是否重复
```

### 6.2 OpenRouter 接入

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-OpenRouter-Title': 'AI Hotspot Tracker',
  },
});

// 快速模型调用
const result = await client.chat.completions.create({
  model: 'z-ai/glm-4.7-flash',
  messages: [{ role: 'user', content: '...' }],
  response_format: { type: 'json_object' },
});
```

### 6.3 TwitterAPI.io 接入

```javascript
// 关键词搜索
const resp = await fetch(
  `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${query}&queryType=Latest`,
  { headers: { 'X-API-Key': process.env.TWITTER_API_KEY } }
);

// 趋势获取
const resp = await fetch(
  `https://api.twitterapi.io/twitter/trends?woeid=1`,
  { headers: { 'X-API-Key': process.env.TWITTER_API_KEY } }
);
```

## 7. SSE 实现

```javascript
// 服务端 (Express)
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const handler = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  eventBus.on('push', handler);
  req.on('close', () => eventBus.off('push', handler));
});

// 客户端
const source = new EventSource('/api/events');
source.onmessage = (e) => {
  const data = JSON.parse(e.data);
  // 更新UI
};
```

## 8. 前端组件

### 8.1 Layout（布局）
- 顶栏：Logo + 搜索 + 通知铃铛 + 设置
- 主内容区：雷达 + 信号流
- 侧滑面板：详情

### 8.2 Radar（雷达组件）
- Canvas 绘制
- 旋转扫描线（4秒一圈）
- 信号点：大小=热度，颜色=可信度
- 鼠标悬浮显示tooltip，点击打开详情
- 新信号脉冲入场动画

### 8.3 SignalCard（信号卡片）
- 来源图标（Twitter/HN/GitHub/RSS/网页）
- 标题 + AI摘要
- 热度分数 + 可信度标记
- 时间显示
- 关键词标签

### 8.4 KeywordManager（关键词管理）
- 添加/删除关键词
- 每个关键词的状态（匹配数、最后匹配时间）
- 通知设置（最低相关度、仅高可信度）

### 8.5 DetailPanel（详情面板）
- 右侧滑入
- 完整信息：标题、来源、原文链接、AI摘要、热度、可信度、AI判断依据
- 关键词匹配详情

## 9. 环境变量

```env
# OpenRouter
OPENROUTER_API_KEY=sk-or-xxx

# TwitterAPI.io
TWITTER_API_KEY=xxx

# 服务配置
PORT=3000

# AI模型
AI_MODEL_FAST=z-ai/glm-4.7-flash
AI_MODEL_REASONING=deepseek/deepseek-r1

# 采集配置
COLLECT_INTERVAL_MINUTES=15
TWITTER_COLLECT_INTERVAL_MINUTES=30
WEB_SEARCH_INTERVAL_SECONDS=30

# 通知配置
NOTIFICATION_MIN_RELEVANCE=0.7
NOTIFICATION_MIN_CREDIBILITY=medium
```

## 10. 预设 RSS 源

```json
[
  { "name": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml" },
  { "name": "Anthropic Blog", "url": "https://www.anthropic.com/feed.xml" },
  { "name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { "name": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" }
]
```

## 11. MCP Server 设计（第二阶段）

4个工具：
- `track_keywords` — 添加关键词监控
- `get_trending` — 获取当前热点（可按分类、热度筛选）
- `check_credibility` — 检查信息可信度
- `get_keyword_matches` — 查询关键词匹配结果

配置示例：
```json
{
  "mcpServers": {
    "ai-hotspot-tracker": {
      "command": "node",
      "args": ["skills/mcp-server.js"],
      "env": { "OPENROUTER_API_KEY": "xxx", "TWITTER_API_KEY": "xxx" }
    }
  }
}
```
