import React, { useState } from 'react';

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

export default function SearchPanel({ keywords }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');
  const [credFilter, setCredFilter] = useState('');

  async function doSearch(q) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ keyword: searchQuery.trim(), limit: 30 });
      if (sourceFilter) params.set('source', sourceFilter);
      if (credFilter) params.set('credibility', credFilter);

      const resp = await fetch(`/api/hotspots?${params}`);
      const data = await resp.json();
      setResults(data.data || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* 搜索框 */}
      <div className="mb-5">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="输入关键词搜索热点..."
            className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 pl-10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
          />
          <span className="absolute left-3 top-3.5 text-gray-500">🔍</span>
          <button
            onClick={() => doSearch()}
            className="absolute right-2 top-2 bg-brand hover:bg-brand-dark text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            搜索
          </button>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-3 mt-3">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-brand"
          >
            <option value="">全部来源</option>
            <option value="hn">HackerNews</option>
            <option value="twitter">Twitter</option>
            <option value="github">GitHub</option>
            <option value="rss">RSS</option>
            <option value="web_search">网页搜索</option>
          </select>

          <select
            value={credFilter}
            onChange={e => setCredFilter(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-brand"
          >
            <option value="">全部可信度</option>
            <option value="high">高可信度</option>
            <option value="medium">中等可信度</option>
            <option value="low">低可信度</option>
          </select>

          {/* 快速搜索标签 */}
          <div className="flex gap-1.5 ml-auto">
            {keywords.filter(k => k.is_active).slice(0, 5).map(k => (
              <button
                key={k.id}
                onClick={() => { setQuery(k.word); doSearch(k.word); }}
                className="px-2 py-1 rounded-md text-xs bg-dark-600 text-gray-400 hover:bg-dark-500 hover:text-white transition-colors"
              >
                {k.word}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 搜索结果 */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-3xl mb-2 animate-spin-slow">📡</div>
          <div className="text-sm text-gray-500">搜索中...</div>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">🤷</div>
          <div className="text-sm text-gray-500">未找到相关热点</div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-3">找到 {results.length} 条相关热点</div>
          <div className="space-y-2">
            {results.map((h, i) => (
              <div key={h.id || i}
                className="bg-dark-700 border border-dark-600 rounded-lg p-3.5 hover:border-dark-500 transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: (srcColors[h.source] || '#8b949e') + '18', color: srcColors[h.source] || '#8b949e' }}>
                    {srcIcons[h.source] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">{h.source}</span>
                      {h.heat_score && <span className="text-xs text-accent-yellow">热度 {h.heat_score.toFixed(1)}</span>}
                      {h.credibility && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full"
                            style={{ background: h.credibility === 'high' ? '#3FB950' : h.credibility === 'medium' ? '#60A5FA' : '#FF9F43' }} />
                          {h.credibility === 'high' ? '可信' : h.credibility === 'medium' ? '待验' : '存疑'}
                        </span>
                      )}
                    </div>
                    <a href={h.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-white hover:text-brand-light leading-snug line-clamp-2 block transition-colors">
                      {h.title}
                    </a>
                    {h.summary && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{h.summary}</p>}
                    <div className="text-xs text-gray-500 mt-1.5">{ago(h.collected_at || h.published_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未搜索时的提示 */}
      {!searched && !loading && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔎</div>
          <div className="text-sm text-gray-500 mb-4">输入关键词搜索热点消息</div>
          {keywords.filter(k => k.is_active).length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-xs text-gray-500 mr-1">快速搜索：</span>
              {keywords.filter(k => k.is_active).map(k => (
                <button
                  key={k.id}
                  onClick={() => { setQuery(k.word); doSearch(k.word); }}
                  className="px-3 py-1 rounded-lg text-xs bg-dark-700 text-gray-300 hover:bg-brand hover:text-white transition-colors"
                >
                  {k.word}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
