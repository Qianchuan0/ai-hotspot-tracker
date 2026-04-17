import React from 'react';

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

function priorityTag(heat) {
  if (!heat) return null;
  if (heat >= 8) return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-accent-orange text-white">HIGH</span>;
  if (heat >= 5) return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-accent-yellow text-dark-900">MEDIUM</span>;
  if (heat >= 3) return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-dark-600 text-gray-300">LOW</span>;
  return null;
}

function credDot(cred) {
  if (!cred) return null;
  const colors = { high: '#3FB950', medium: '#60A5FA', low: '#FF9F43' };
  const labels = { high: '可信', medium: '待验', low: '存疑' };
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[cred] || '#666' }} />
      {labels[cred] || cred}
    </span>
  );
}

export default function Dashboard({ hotspots, keywords }) {
  // 统计
  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % 86400);
  const totalCount = hotspots.length;
  const todayNew = hotspots.filter(h => (h.collected_at || h.published_at) >= todayStart).length;
  const urgentCount = hotspots.filter(h => h.heat_score && h.heat_score >= 8).length;

  const stats = [
    { label: '总热点', value: totalCount, color: '#8A5CF6', icon: '📊' },
    { label: '今日新增', value: todayNew, color: '#4ECDC4', icon: '📈' },
    { label: '紧急热点', value: urgentCount, color: '#FF6B6B', icon: '🔥' },
  ];

  return (
    <div className="animate-fade-in">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-dark-700 rounded-xl p-4 border border-dark-600">
            <div className="text-gray-400 text-xs mb-1 flex items-center gap-1.5">
              <span>{s.icon}</span> {s.label}
            </div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 最新热点 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🔥</span>
        <h2 className="text-white font-semibold text-sm">最新热点</h2>
        <span className="text-xs text-gray-500 ml-auto">{hotspots.length} 条</span>
      </div>

      <div className="space-y-2">
        {hotspots.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">📡</div>
            <div className="text-sm">暂无热点数据，点击"立即检查"开始采集</div>
          </div>
        )}
        {hotspots.map((h, i) => (
          <div key={h.id || i}
            className="bg-dark-700 border border-dark-600 rounded-lg p-3.5 hover:border-dark-500 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex gap-3">
              {/* 来源图标 */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: (srcColors[h.source] || '#8b949e') + '18', color: srcColors[h.source] || '#8b949e' }}>
                {srcIcons[h.source] || '?'}
              </div>

              <div className="flex-1 min-w-0">
                {/* 标签行 */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {priorityTag(h.heat_score)}
                  <span className="text-xs text-gray-500">{h.source}</span>
                  {h.credibility && credDot(h.credibility)}
                  {h.heat_score && (
                    <span className="text-xs text-accent-yellow ml-auto">热度 {h.heat_score.toFixed(1)}</span>
                  )}
                </div>

                {/* 标题 */}
                <a href={h.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-white hover:text-brand-light leading-snug line-clamp-2 block transition-colors">
                  {h.title}
                </a>

                {/* 摘要 */}
                {h.summary && (
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{h.summary}</p>
                )}

                {/* 底部信息 */}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{ago(h.collected_at || h.published_at)}</span>
                  {h.warning && (
                    <span className="text-accent-orange flex items-center gap-1">
                      <span>⚠</span> {h.warning.slice(0, 30)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
