import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB } from './db.js';
import keywordsRouter from './routes/keywords.js';
import hotspotsRouter from './routes/hotspots.js';
import notificationsRouter from './routes/notifications.js';
import eventsRouter from './routes/events.js';
import { startScheduler } from './collectors/scheduler.js';

// 加载 .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/keywords', keywordsRouter);
app.use('/api/hotspots', hotspotsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/events', eventsRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 手动触发采集
app.post('/api/collect', async (req, res) => {
  try {
    const { runAllOnce } = await import('./collectors/scheduler.js');
    runAllOnce();
    res.json({ status: 'started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 手动触发AI分析
app.post('/api/analyze', async (req, res) => {
  try {
    const { triggerAnalysis } = await import('./ai/analyzer.js');
    const result = await triggerAnalysis();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 初始化数据库，然后启动服务
async function start() {
  try {
    await initDB();

    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);

      // 启动采集调度器
      startScheduler();
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();
