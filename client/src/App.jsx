import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

  const { lastEvent, connected } = useSSE();
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'new_hotspot') loadHotspots();
    else if (lastEvent.type === 'notification') loadNotifications();
  }, [lastEvent, loadHotspots, loadNotifications]);

  async function handleCheckNow() {
    setChecking(true);
    try {
      await fetch('/api/collect', { method: 'POST' });
      setTimeout(() => {
        loadHotspots();
        setChecking(false);
      }, 8000);
    } catch {
      setChecking(false);
    }
  }

  async function handleAddKeyword(word) {
    await apiFetch('/keywords', { method: 'POST', body: JSON.stringify({ word }) });
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

  async function handleMarkRead(id) {
    await apiFetch(`/notifications/${id}`, { method: 'PATCH' });
    loadNotifications();
  }

  async function handleMarkAllRead() {
    await apiFetch('/notifications/read-all', { method: 'POST' });
    loadNotifications();
  }

  return (
    <div className="min-h-screen bg-dark-950 grid-bg flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 品牌 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-accent-cyan flex items-center justify-center shadow-glow-brand">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-wider">SIGNAL RADAR</div>
              <div className="text-gray-500 text-[10px] leading-tight">AI 热点信号追踪</div>
            </div>
          </div>

          {/* 操作区 */}
          <div className="flex items-center gap-3">
            {/* SSE 状态 */}
            <span
              className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-accent-green shadow-glow-green' : 'bg-gray-600'}`}
              title={connected ? '实时连接中' : '连接断开'}
            />

            {/* 扫描按钮 */}
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                checking
                  ? 'bg-white/5 text-gray-500 cursor-wait'
                  : 'bg-brand/15 text-brand-light hover:bg-brand/25 hover:shadow-glow-brand'
              }`}
            >
              {checking ? (
                <>
                  <span className="animate-spin-slow text-sm">◌</span>
                  扫描中...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  扫描信号
                </>
              )}
            </button>

            {/* 通知铃铛 */}
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-red text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-glow-red">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 标签栏 - Aceternity 风格动画指示器 */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-5 py-2.5 text-xs font-medium transition-colors ${
                  tab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-brand to-accent-cyan rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <main className="flex-1 p-4 min-w-0">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Dashboard hotspots={hotspots} keywords={keywords} />
              </motion.div>
            )}
            {tab === 'keywords' && (
              <motion.div
                key="keywords"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <KeywordManager
                  keywords={keywords}
                  onAdd={handleAddKeyword}
                  onDelete={handleDeleteKeyword}
                  onToggle={handleToggleKeyword}
                />
              </motion.div>
            )}
            {tab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <SearchPanel keywords={keywords} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 右侧通知栏 */}
        <aside
          className={`w-72 border-l border-white/[0.06] bg-dark-900/80 flex-shrink-0 transition-all duration-300 ${
            showNotif ? 'block' : 'hidden lg:block'
          }`}
        >
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
