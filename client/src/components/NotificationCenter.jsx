import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_STYLES = {
  keyword_match: { icon: '◎', color: 'text-accent-cyan' },
  high_heat: { icon: '◆', color: 'text-accent-red' },
  credibility_alert: { icon: '⚠', color: 'text-accent-orange' },
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-xs">信号通知</span>
          {unreadCount > 0 && (
            <span className="bg-accent-red/15 text-accent-red text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-accent-red/20">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-[10px] text-gray-500 hover:text-brand-light transition-colors"
          >
            全部已读
          </button>
        )}
      </div>

      {/* 通知列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="text-2xl mb-2 text-gray-700">◎</div>
            <div className="text-[10px] text-gray-600">暂无通知</div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {notifications.map(n => {
            const style = TYPE_STYLES[n.type] || { icon: '◎', color: 'text-gray-400' };
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                onClick={() => !n.is_read && onMarkRead(n.id)}
                className={`rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                  n.is_read
                    ? 'bg-dark-900/30 opacity-40'
                    : 'bg-dark-900/80 border-l-2 border-brand hover:bg-dark-800/80'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-xs flex-shrink-0 mt-0.5 ${n.is_read ? 'text-gray-700' : style.color}`}>
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-200'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-gray-700 mt-1 font-mono">{formatTime(n.created_at)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
