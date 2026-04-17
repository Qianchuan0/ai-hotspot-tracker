import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function KeywordManager({ keywords, onAdd, onDelete, onToggle }) {
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const word = input.trim();
    if (!word) return;
    setAdding(true);
    try {
      await onAdd(word);
      setInput('');
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  }

  const activeKeywords = keywords.filter(k => k.is_active);
  const pausedKeywords = keywords.filter(k => !k.is_active);

  return (
    <div>
      {/* 添加关键词输入框 */}
      <div className="mb-6">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-accent-green/10 to-accent-cyan/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-lg" />
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="添加监控关键词，如 GPT-5、Claude 4..."
              className="w-full bg-dark-900 border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-accent-green/30 focus:bg-dark-800 transition-all duration-200"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !input.trim()}
              className="absolute right-2 top-2 bg-accent-green/15 hover:bg-accent-green/25 disabled:bg-white/[0.03] disabled:text-gray-600 text-accent-green text-xs font-medium px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              {adding ? '...' : '添加'}
            </button>
          </div>
        </div>
        <div className="text-[10px] text-gray-600 mt-2 ml-1">
          添加关键词后，系统将自动监控所有数据源中的匹配信号
        </div>
      </div>

      {/* 活跃关键词 */}
      {activeKeywords.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-glow-green animate-pulse-dot" />
            <span className="text-xs font-medium text-white">活跃监控</span>
            <span className="text-[10px] text-gray-600 font-mono">{activeKeywords.length}</span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {activeKeywords.map(k => (
                <KeywordCard key={k.id} keyword={k} onDelete={onDelete} onToggle={onToggle} active />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 已暂停关键词 */}
      {pausedKeywords.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <span className="text-xs font-medium text-gray-500">已暂停</span>
            <span className="text-[10px] text-gray-600 font-mono">{pausedKeywords.length}</span>
          </div>
          <div className="space-y-1.5">
            {pausedKeywords.map(k => (
              <KeywordCard key={k.id} keyword={k} onDelete={onDelete} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {keywords.length === 0 && (
        <div className="text-center py-20">
          <div className="text-3xl mb-3 text-gray-700">◎</div>
          <div className="text-xs text-gray-600">添加关键词开始监控 AI 热点信号</div>
        </div>
      )}
    </div>
  );
}

function KeywordCard({ keyword, onDelete, onToggle, active }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 ${
        active
          ? 'bg-dark-900/80 border-white/[0.04] hover:border-white/[0.08]'
          : 'bg-dark-900/40 border-white/[0.02] opacity-50'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          active ? 'bg-accent-green shadow-glow-green' : 'bg-gray-600'
        }`}
      />
      <span className={`flex-1 text-sm font-medium ${active ? 'text-white' : 'text-gray-500'}`}>
        {keyword.word}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onToggle(keyword.id, active ? 0 : 1)}
          className="text-[10px] px-2 py-1 rounded-md bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
        >
          {active ? '暂停' : '恢复'}
        </button>
        <button
          onClick={() => onDelete(keyword.id)}
          className="text-[10px] px-2 py-1 rounded-md bg-white/[0.03] text-gray-500 hover:text-accent-red hover:bg-accent-red/10 transition-all duration-200"
        >
          删除
        </button>
      </div>
    </motion.div>
  );
}
