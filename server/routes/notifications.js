import { Router } from 'express';
import { all, get, run } from '../db.js';

const router = Router();

// 通知列表
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = unread_only === 'true' ? 'WHERE is_read = 0' : '';
    const notifications = all(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const countResult = get(`SELECT COUNT(*) as total FROM notifications ${where}`);
    const unreadResult = get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');

    res.json({
      data: notifications,
      unread_count: unreadResult.count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 标记单条已读
router.patch('/:id', (req, res) => {
  try {
    run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 全部已读
router.post('/read-all', (req, res) => {
  try {
    run('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
