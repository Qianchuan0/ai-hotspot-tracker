import React, { useState, useEffect } from 'react';

const TYPE_ICONS = {
  keyword_match: '🎯',
  high_heat: '🔥',
  credibility_alert: '⚠️',
};

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString('zh-CN');
}

export default function NotificationCenter({ notifications, unreadCount, onMarkRead, onMarkAllRead }) {
  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">通知</span>
          {unreadCount > 0 && (
            <span className="bg-accent-red text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-brand hover:text-brand-light transition-colors"
          >
            全部已读
          </button>
        )}
      </div>

      {/* 通知列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🔔</div>
            <div className="text-xs text-gray-500">暂无通知</div>
          </div>
        )}
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => !n.is_read && onMarkRead(n.id)}
            className={`rounded-lg p-3 cursor-pointer transition-colors ${
              n.is_read
                ? 'bg-dark-800 opacity-50'
                : 'bg-dark-700 border-l-2 border-brand hover:bg-dark-600'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '📡'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${n.is_read ? 'text-gray-500' : 'text-white'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.body}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">{formatTime(n.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
