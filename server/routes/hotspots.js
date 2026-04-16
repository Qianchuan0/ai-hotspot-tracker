import { Router } from 'express';
import { all, get, run } from '../db.js';

const router = Router();

// 热点列表（支持分页、排序、筛选）
router.get('/', (req, res) => {
  try {
    const {
      source,
      min_heat,
      credibility,
      keyword,
      page = 1,
      limit = 20,
      sort = 'time_desc',
    } = req.query;

    const conditions = [];
    const params = [];

    if (source) {
      conditions.push('h.source = ?');
      params.push(source);
    }
    if (min_heat) {
      conditions.push('h.heat_score >= ?');
      params.push(parseFloat(min_heat));
    }
    if (credibility) {
      conditions.push('h.credibility = ?');
      params.push(credibility);
    }
    if (keyword) {
      conditions.push(`
        h.id IN (
          SELECT hk.hotspot_id FROM hotspot_keywords hk
          JOIN keywords k ON hk.keyword_id = k.id
          WHERE k.word LIKE ?
        )
      `);
      params.push(`%${keyword}%`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 排序
    let orderBy = 'h.collected_at DESC';
    if (sort === 'heat_desc') orderBy = 'h.heat_score DESC NULLS LAST';
    else if (sort === 'credibility_desc') orderBy = 'h.credibility_score DESC NULLS LAST';

    const hotspots = all(
      `SELECT h.* FROM hotspots h ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const countResult = get(`SELECT COUNT(*) as total FROM hotspots h ${where}`, params);

    res.json({
      data: hotspots,
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

// 热点详情
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const hotspot = get('SELECT * FROM hotspots WHERE id = ?', [id]);
    if (!hotspot) {
      return res.status(404).json({ error: '热点不存在' });
    }

    // 获取关联的关键词
    const keywords = all(
      `SELECT k.*, hk.relevance_score
       FROM hotspot_keywords hk
       JOIN keywords k ON hk.keyword_id = k.id
       WHERE hk.hotspot_id = ?`,
      [id]
    );

    res.json({ ...hotspot, keywords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
