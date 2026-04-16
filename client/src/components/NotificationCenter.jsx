import React, { useState, useEffect } from 'react';
import { apiFetch } from '../hooks/useApi';

const TYPE_ICONS = {
  keyword_match: '🎯',
  high_heat: '🔥',
  credibility_alert: '⚠️',
};

export default function NotificationCenter({ onMarkAllRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const result = await apiFetch('/notifications?limit=30');
      setNotifications(result.data || []);
    } catch (err) {
      console.error('Load notifications failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id) {
    try {
      await apiFetch(`/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
    } catch {}
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN');
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-radar-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-radar-muted uppercase tracking-wider">
          通知中心
        </h2>
        <button
          onClick={async () => { await onMarkAllRead(); setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 }))); }}
          className="text-xs text-gray-500 hover:text-radar-scan transition-colors"
        >
          全部已读
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 text-sm py-4">加载中...</p>
      ) : notifications.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-4">暂无通知</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => n.is_read ? null : handleMarkRead(n.id)}
              className={`rounded-lg p-3 cursor-pointer transition-colors ${
                n.is_read ? 'bg-gray-900/30 opacity-60' : 'bg-gray-900/80 border-l-2 border-radar-scan'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm shrink-0">{TYPE_ICONS[n.type] || '📡'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-radar-muted mt-1 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">{formatTime(n.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
