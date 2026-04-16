import { Router } from 'express';
import { getDB, all, get, run } from '../db.js';

const router = Router();

// 获取所有关键词
router.get('/', (req, res) => {
  try {
    const keywords = all('SELECT * FROM keywords ORDER BY created_at DESC');
    res.json(keywords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 添加关键词
router.post('/', (req, res) => {
  try {
    const { word } = req.body;
    if (!word || !word.trim()) {
      return res.status(400).json({ error: '关键词不能为空' });
    }

    const trimmed = word.trim();

    // 检查是否已存在
    const existing = get('SELECT * FROM keywords WHERE word = ?', [trimmed]);
    if (existing) {
      return res.status(409).json({ error: '关键词已存在', keyword: existing });
    }

    const result = run('INSERT INTO keywords (word) VALUES (?)', [trimmed]);
    const newKeyword = get('SELECT * FROM keywords WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(newKeyword);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除关键词
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const keyword = get('SELECT * FROM keywords WHERE id = ?', [id]);
    if (!keyword) {
      return res.status(404).json({ error: '关键词不存在' });
    }

    run('DELETE FROM hotspot_keywords WHERE keyword_id = ?', [id]);
    run('DELETE FROM keywords WHERE id = ?', [id]);
    res.json({ success: true, deleted: keyword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新关键词状态（暂停/恢复）
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'number' || ![0, 1].includes(is_active)) {
      return res.status(400).json({ error: 'is_active 必须是 0 或 1' });
    }

    const keyword = get('SELECT * FROM keywords WHERE id = ?', [id]);
    if (!keyword) {
      return res.status(404).json({ error: '关键词不存在' });
    }

    run('UPDATE keywords SET is_active = ? WHERE id = ?', [is_active, id]);
    const updated = get('SELECT * FROM keywords WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
