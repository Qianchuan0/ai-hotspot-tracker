import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* 搜索框 - 聚焦光晕 */}
      <div className="mb-5">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-brand/20 to-accent-cyan/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-lg" />
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="搜索热点信号..."
              className="w-full bg-dark-900 border border-white/[0.06] rounded-xl px-4 py-3 pl-10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand/30 focus:bg-dark-800 transition-all duration-200"
            />
            <svg
              className="absolute left-3 top-3.5 w-4 h-4 text-gray-600"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <button
              onClick={() => doSearch()}
              className="absolute right-2 top-2 bg-brand/15 hover:bg-brand/25 text-brand-light text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200"
            >
              搜索
            </button>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-3 mt-3">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="bg-dark-900 border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] text-gray-400 focus:outline-none focus:border-brand/30 transition-colors"
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
            className="bg-dark-900 border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] text-gray-400 focus:outline-none focus:border-brand/30 transition-colors"
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
                className="px-2 py-1 rounded-md text-[10px] bg-white/[0.03] text-gray-400 hover:bg-brand/15 hover:text-brand-light transition-all border border-white/[0.04]"
              >
                {k.word}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <div className="text-[10px] text-gray-600 mt-3 font-mono tracking-wider">SCANNING...</div>
        </div>
      )}

      {/* 空结果 */}
      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-2xl mb-2 text-gray-700">⊘</div>
          <div className="text-xs text-gray-600">未发现匹配信号</div>
        </div>
      )}

      {/* 搜索结果 */}
      <AnimatePresence>
        {!loading && results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-[10px] text-gray-600 mb-3 font-mono tracking-wider">
              {results.length} RESULTS
            </div>
            <div className="space-y-1.5">
              {results.map((h, i) => (
                <motion.div
                  key={h.id || i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="group bg-dark-900/60 border border-white/[0.03] rounded-lg p-3.5 hover:border-white/[0.08] hover:bg-white/[0.02] transition-all duration-200"
                >
                  <div className="flex gap-3">
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-gray-600 font-mono uppercase">{h.source}</span>
                        {h.heat_score && (
                          <span className="text-[10px] text-accent-yellow/80 font-mono">◈ {h.heat_score.toFixed(1)}</span>
                        )}
                        {h.credibility && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: h.credibility === 'high' ? '#10b981' : h.credibility === 'medium' ? '#22d3ee' : '#f59e0b',
                              }}
                            />
                            {h.credibility === 'high' ? '可信' : h.credibility === 'medium' ? '待验' : '存疑'}
                          </span>
                        )}
                      </div>
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-200 group-hover:text-white line-clamp-2 block transition-colors"
                      >
                        {h.title}
                      </a>
                      {h.summary && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{h.summary}</p>}
                      <div className="text-[10px] text-gray-600 mt-1.5 font-mono">{ago(h.collected_at || h.published_at)}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 初始状态 */}
      {!searched && !loading && (
        <div className="text-center py-20">
          <div className="text-3xl mb-3 text-gray-700">⊘</div>
          <div className="text-xs text-gray-600 mb-4">输入关键词搜索热点信号</div>
          {keywords.filter(k => k.is_active).length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-[10px] text-gray-600 mr-1">快速搜索:</span>
              {keywords.filter(k => k.is_active).map(k => (
                <button
                  key={k.id}
                  onClick={() => { setQuery(k.word); doSearch(k.word); }}
                  className="px-3 py-1 rounded-lg text-xs bg-white/[0.03] text-gray-400 hover:bg-brand/15 hover:text-brand-light transition-all border border-white/[0.04]"
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
