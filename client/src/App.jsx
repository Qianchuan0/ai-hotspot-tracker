import React, { useState, useEffect } from 'react';

const API = '/api';

export default function App() {
  const [hotspots, setHotspots] = useState([]);
  const [error, setError] = useState('');
  const [keywords, setKeywords] = useState([]);

  useEffect(() => {
    console.log('[App] useEffect fired');

    fetch(API + '/hotspots?limit=20')
      .then(r => {
        console.log('[App] hotspots response:', r.status);
        return r.json();
      })
      .then(j => {
        console.log('[App] hotspots data:', j.data?.length, 'items');
        setHotspots(j.data || []);
      })
      .catch(e => {
        console.error('[App] hotspots error:', e);
        setError('Hotspots: ' + e.message);
      });

    fetch(API + '/keywords')
      .then(r => r.json())
      .then(j => {
        console.log('[App] keywords:', j?.length);
        setKeywords(Array.isArray(j) ? j : []);
      })
      .catch(e => {
        console.error('[App] keywords error:', e);
        setError(prev => prev + ' | Keywords: ' + e.message);
      });
  }, []);

  function ago(ts) {
    if (!ts) return '';
    const d = Date.now()/1000 - ts;
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d/60) + '分钟前';
    if (d < 86400) return Math.floor(d/3600) + '小时前';
    return Math.floor(d/86400) + '天前';
  }

  const srcColors = {
    twitter: '#1d9bf0', web_search: '#58a6ff',
    hn: '#f0883e', github: '#8b949e', rss: '#d2a8ff'
  };
  const srcIcons = {
    twitter: '𝕏', web_search: '🔍', hn: 'Y', github: '⭐', rss: '📰'
  };

  return (
    <div style={{ background: '#060a13', color: '#c9d1d9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #1a2332', background: 'rgba(6,10,19,0.95)', backdropFilter: 'blur(12px)', padding: '0 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', height: 56, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,255,178,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FFB2' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AI Hotspot Tracker</div>
              <div style={{ fontSize: 10, color: '#546178', marginTop: -2 }}>SIGNAL RADAR</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#546178' }}>监控 ({keywords.length})</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {error && (
          <div style={{ background: '#f8514920', border: '1px solid #f85149', borderRadius: 8, padding: 12, marginBottom: 16, color: '#f85149', fontSize: 13 }}>
            Error: {error}
          </div>
        )}

        {hotspots.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
            <div style={{ color: '#546178', fontSize: 14 }}>加载中...</div>
          </div>
        )}

        {hotspots.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 16, borderRadius: 2, background: '#00FFB2' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#546178', letterSpacing: 2, textTransform: 'uppercase' }}>信号流</span>
              <span style={{ fontSize: 11, color: '#30363d', marginLeft: 'auto' }}>{hotspots.length} 条</span>
            </div>

            {hotspots.map((h, i) => (
              <div key={h.id || i} style={{
                background: '#0d1117', border: '1px solid #1a2332', borderRadius: 8,
                padding: 14, marginBottom: 8, cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: (srcColors[h.source] || '#8b949e') + '18',
                    color: srcColors[h.source] || '#8b949e'
                  }}>
                    {srcIcons[h.source] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {h.title}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 11, color: '#546178' }}>
                      <span>{h.source}</span>
                      <span>{ago(h.collected_at || h.published_at)}</span>
                      {h.heat_score && <span style={{ color: '#d29922' }}>热度 {h.heat_score.toFixed(1)}</span>}
                      {h.credibility && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: h.credibility === 'high' ? '#3fb950' : h.credibility === 'medium' ? '#58a6ff' : '#d29922' }} />
                          {h.credibility === 'high' ? '可信' : h.credibility === 'medium' ? '待验' : '存疑'}
                        </span>
                      )}
                    </div>
                    <a href={h.url} target="_blank" rel="noopener" style={{ fontSize: 11, color: '#58a6ff', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                      查看原文 →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
