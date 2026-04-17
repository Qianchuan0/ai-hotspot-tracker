import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MovingBorder } from './ui/MovingBorder';

const srcIcons = {
  twitter: '𝕏', web_search: '🔍', hn: 'Y', github: '⭐', rss: '📰'
};
const srcColors = {
  twitter: '#1d9bf0', web_search: '#58a6ff', hn: '#f0883e', github: '#8b949e', rss: '#d2a8ff'
};

function ago(ts) {
  if (!ts) return '';
  const d = Date.now() / 1000 - ts;
  if (d < 60) return '刚刚';
  if (d < 3600) return Math.floor(d / 60) + '分钟前';
  if (d < 86400) return Math.floor(d / 3600) + '小时前';
  return Math.floor(d / 86400) + '天前';
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (display === value) return;
    const step = Math.max(1, Math.ceil(Math.abs(value - display) / 10));
    const timer = setInterval(() => {
      setDisplay(prev => {
        const diff = value - prev;
        if (Math.abs(diff) <= step) return value;
        return prev + (diff > 0 ? step : -step);
      });
    }, 30);
    return () => clearInterval(timer);
  }, [value, display]);

  return <span>{display}</span>;
}

function priorityTag(heat) {
  if (!heat) return null;
  if (heat >= 8) return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-orange/15 text-accent-orange border border-accent-orange/20">
      HIGH
    </span>
  );
  if (heat >= 5) return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/20">
      MEDIUM
    </span>
  );
  if (heat >= 3) return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-gray-400 border border-white/[0.06]">
      LOW
    </span>
  );
  return null;
}

function credDot(cred) {
  if (!cred) return null;
  const colors = { high: '#10b981', medium: '#22d3ee', low: '#f59e0b' };
  const labels = { high: '可信', medium: '待验', low: '存疑' };
  return (
    <span className="flex items-center gap-1 text-[10px] text-gray-500">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: colors[cred] || '#666', boxShadow: `0 0 4px ${colors[cred] || '#666'}40` }}
      />
      {labels[cred] || cred}
    </span>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' },
  }),
};

export default function Dashboard({ hotspots, keywords }) {
  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % 86400);
  const totalCount = hotspots.length;
  const todayNew = hotspots.filter(h => (h.collected_at || h.published_at) >= todayStart).length;
  const urgentCount = hotspots.filter(h => h.heat_score && h.heat_score >= 8).length;

  const stats = [
    { label: '总热点', value: totalCount, gradient: 'from-brand to-brand-light', glow: 'shadow-glow-brand' },
    { label: '今日新增', value: todayNew, gradient: 'from-accent-cyan to-accent-blue', glow: 'shadow-glow-cyan' },
    { label: '紧急热点', value: urgentCount, gradient: 'from-accent-red to-accent-orange', glow: 'shadow-glow-red' },
  ];

  return (
    <div>
      {/* 统计卡片 - MovingBorder 动画边框 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((s, i) => (
          <MovingBorder key={s.label} duration={6000 + i * 1500} containerClassName="flex-1">
            <div className="bg-dark-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs tracking-wide">{s.label}</span>
              </div>
              <div className={`text-3xl font-bold tabular-nums bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>
                <AnimatedCounter value={s.value} />
              </div>
            </div>
          </MovingBorder>
        ))}
      </div>

      {/* 最新热点标题 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-red shadow-glow-red" />
        <h2 className="text-white font-semibold text-sm">实时信号</h2>
        <span className="text-[10px] text-gray-600 ml-auto font-mono tracking-wider">
          {hotspots.length} SIGNALS
        </span>
      </div>

      {/* 热点列表 */}
      <div className="space-y-1.5">
        {hotspots.length === 0 && (
          <div className="text-center py-20">
            <div className="text-gray-700 text-lg mb-2">◎</div>
            <div className="text-xs text-gray-600">等待信号接入...</div>
            <div className="text-[10px] text-gray-700 mt-1">点击上方「扫描信号」开始采集</div>
          </div>
        )}

        {hotspots.map((h, i) => (
          <motion.div
            key={h.id || i}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="group bg-dark-900/60 border border-white/[0.03] rounded-lg p-3.5 hover:border-white/[0.08] hover:bg-white/[0.02] transition-all duration-200 cursor-pointer">
              <div className="flex gap-3">
                {/* 来源图标 */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border"
                  style={{
                    background: (srcColors[h.source] || '#8b949e') + '0a',
                    color: srcColors[h.source] || '#8b949e',
                    borderColor: (srcColors[h.source] || '#8b949e') + '18',
                  }}
                >
                  {srcIcons[h.source] || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 标签行 */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {priorityTag(h.heat_score)}
                    <span className="text-[10px] text-gray-600 font-mono uppercase">{h.source}</span>
                    {h.credibility && credDot(h.credibility)}
                    {h.heat_score && (
                      <span className="text-[10px] text-accent-yellow/80 ml-auto font-mono">
                        ◈ {h.heat_score.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* 标题 */}
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-200 group-hover:text-white leading-snug line-clamp-2 block transition-colors"
                  >
                    {h.title}
                  </a>

                  {/* 摘要 */}
                  {h.summary && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{h.summary}</p>
                  )}

                  {/* 底部信息 */}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                    <span className="font-mono">{ago(h.collected_at || h.published_at)}</span>
                    {h.warning && (
                      <span className="text-accent-orange flex items-center gap-1">
                        ⚠ {h.warning.slice(0, 30)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
