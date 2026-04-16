import { Router } from 'express';
import { EventEmitter } from 'events';

const router = Router();

// 全局事件总线
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);

// SSE 端点
router.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // 发送初始连接确认
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  const handler = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // 连接已关闭
    }
  };

  eventBus.on('push', handler);

  // 心跳保活
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    eventBus.off('push', handler);
    clearInterval(heartbeat);
  });
});

// 推送事件给所有连接的客户端
export function pushEvent(type, data) {
  eventBus.emit('push', { type, data, timestamp: Date.now() });
}

export default router;
