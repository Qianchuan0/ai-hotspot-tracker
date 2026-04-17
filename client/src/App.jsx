import React, { useState, useEffect, useCallback } from 'react';
import { useSSE, apiFetch } from './hooks/useApi';
import Dashboard from './components/Dashboard';
import SearchPanel from './components/SearchPanel';
import KeywordManager from './components/KeywordManager';
import NotificationCenter from './components/NotificationCenter';

const TABS = [
  { key: 'dashboard', label: '仪表盘' },
  { key: 'keywords', label: '关键词' },
  { key: 'search', label: '搜索' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [hotspots, setHotspots] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // 加载数据
  const loadHotspots = useCallback(() => {
    fetch('/api/hotspots?limit=20&sort=time_desc')
      .then(r => r.json())
      .then(d => setHotspots(d.data || []))
      .catch(() => {});
  }, []);

  const loadKeywords = useCallback(() => {
    fetch('/api/keywords')
      .then(r => r.json())
      .then(d => setKeywords(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const loadNotifications = useCallback(() => {
    fetch('/api/notifications?limit=30')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.data || []);
        setUnreadCount(d.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadHotspots();
    loadKeywords();
    loadNotifications();
  }, [loadHotspots, loadKeywords, loadNotifications]);

  // SSE 实时更新
  const { lastEvent, connected } = useSSE();
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'new_hotspot') {
      loadHotspots();
    } else if (lastEvent.type === 'notification') {
      loadNotifications();
    }
  }, [lastEvent, loadHotspots, loadNotifications]);

  // 立即检查
  async function handleCheckNow() {
    setChecking(true);
    try {
      await fetch('/api/collect', { method: 'POST' });
      // 延迟刷新，等采集完成
      setTimeout(() => {
        loadHotspots();
        setChecking(false);
      }, 8000);
    } catch {
      setChecking(false);
    }
  }

  // 关键词操作
  async function handleAddKeyword(word) {
    await apiFetch('/keywords', {
      method: 'POST',
      body: JSON.stringify({ word }),
    });
    loadKeywords();
  }

  async function handleDeleteKeyword(id) {
    await apiFetch(`/keywords/${id}`, { method: 'DELETE' });
    loadKeywords();
  }

  async function handleToggleKeyword(id, isActive) {
    await apiFetch(`/keywords/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
    loadKeywords();
  }

  // 通知操作
  async function handleMarkRead(id) {
    await apiFetch(`/notifications/${id}`, { method: 'PATCH' });
    loadNotifications();
  }

  async function handleMarkAllRead() {
    await apiFetch('/notifications/read-all', { method: 'POST' });
    loadNotifications();
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-dark-600">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 品牌 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">📡</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">热点监控</div>
              <div className="text-gray-500 text-[10px] leading-tight">AI 实时热点追踪</div>
            </div>
          </div>

          {/* 操作区 */}
          <div className="flex items-center gap-3">
            {/* SSE 连接状态 */}
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-accent-green' : 'bg-gray-600'}`}
              title={connected ? '实时连接中' : '连接断开'} />

            {/* 立即检查 */}
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                checking
                  ? 'bg-dark-700 text-gray-500'
                  : 'bg-brand hover:bg-brand-dark text-white'
              }`}
            >
              <span className={checking ? 'animate-spin-slow' : ''}>{checking ? '⏳' : '🔄'}</span>
              {checking ? '检查中...' : '立即检查'}
            </button>

            {/* 通知铃铛 */}
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-red text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 标签栏 */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                  tab === t.key
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* 左侧主内容 */}
        <main className="flex-1 p-4 min-w-0">
          {tab === 'dashboard' && (
            <Dashboard hotspots={hotspots} keywords={keywords} />
          )}
          {tab === 'keywords' && (
            <KeywordManager
              keywords={keywords}
              onAdd={handleAddKeyword}
              onDelete={handleDeleteKeyword}
              onToggle={handleToggleKeyword}
            />
          )}
          {tab === 'search' && (
            <SearchPanel keywords={keywords} />
          )}
        </main>

        {/* 右侧通知栏 */}
        <aside className={`w-72 border-l border-dark-600 bg-dark-800 flex-shrink-0 transition-all duration-300 ${
          showNotif ? 'block' : 'hidden lg:block'
        }`}>
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </aside>
      </div>
    </div>
  );
}
