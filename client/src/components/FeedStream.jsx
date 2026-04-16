import React from 'react';

const SOURCE_ICONS = {
  twitter: '𝕏',
  web_search: '🔍',
  hn: 'Y',
  github: '⭐',
  rss: '📰',
};

const CREDIBILITY_COLORS = {
  high: 'bg-emerald-500',
  medium: 'bg-blue-500',
  low: 'bg-amber-500',
};

export default function FeedStream({ hotspots = [] }) {
  if (hotspots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-radar-scan mb-4 text-5xl animate-pulse">◉</div>
        <h2 className="text-xl font-semibold mb-2">等待信号</h2>
        <p className="text-radar-muted text-sm max-w-md">
          雷达已启动，正在扫描 AI 领域热点...<br />
          添加关键词以开始监控特定话题
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-radar-muted uppercase tracking-wider">
          实时信号流
        </h2>
        <span className="text-xs text-gray-500">{hotspots.length} 条信号</span>
      </div>

      {hotspots.map((item, idx) => (
        <SignalCard key={item.id || idx} item={item} />
      ))}
    </div>
  );
}

function SignalCard({ item }) {
  const sourceIcon = SOURCE_ICONS[item.source] || '?';
  const credColor = CREDIBILITY_COLORS[item.credibility] || 'bg-gray-500';

  return (
    <div className="group rounded-xl border border-gray-800 bg-radar-card p-4 transition-colors hover:border-gray-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-800 text-xs">
            {sourceIcon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-radar-text leading-snug line-clamp-2">
            {item.title}
          </h3>
          {item.summary && (
            <p className="mt-1 text-xs text-radar-muted line-clamp-2">{item.summary}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            {item.source && <span>{item.source}</span>}
            {item.heat_score && (
              <span className="text-radar-scan">热度 {item.heat_score.toFixed(1)}</span>
            )}
            {item.credibility && (
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${credColor}`} />
                {item.credibility === 'high' ? '可信' : item.credibility === 'medium' ? '待验证' : '存疑'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
