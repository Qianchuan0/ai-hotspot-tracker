import React, { useState } from 'react';

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
    <div className="animate-fade-in">
      {/* 添加关键词 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="输入要监控的关键词，如 GPT-5、Claude 4..."
            className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            className="absolute right-2 top-2 bg-brand hover:bg-brand-dark disabled:bg-dark-600 disabled:text-gray-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {adding ? '添加中...' : '添加监控'}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          添加关键词后，系统将自动从所有数据源搜索匹配的热点并通知你
        </div>
      </div>

      {/* 活跃关键词 */}
      {activeKeywords.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot" />
            <span className="text-sm font-medium text-white">活跃监控</span>
            <span className="text-xs text-gray-500">({activeKeywords.length})</span>
          </div>
          <div className="space-y-2">
            {activeKeywords.map(k => (
              <KeywordCard key={k.id} keyword={k} onDelete={onDelete} onToggle={onToggle} active />
            ))}
          </div>
        </div>
      )}

      {/* 已暂停关键词 */}
      {pausedKeywords.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-sm font-medium text-gray-400">已暂停</span>
            <span className="text-xs text-gray-500">({pausedKeywords.length})</span>
          </div>
          <div className="space-y-2">
            {pausedKeywords.map(k => (
              <KeywordCard key={k.id} keyword={k} onDelete={onDelete} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {keywords.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🎯</div>
          <div className="text-sm text-gray-500">还没有监控关键词</div>
          <div className="text-xs text-gray-600 mt-1">添加关键词开始监控AI热点</div>
        </div>
      )}
    </div>
  );
}

function KeywordCard({ keyword, onDelete, onToggle, active }) {
  return (
    <div className={`bg-dark-700 border rounded-lg p-3 flex items-center gap-3 transition-colors ${active ? 'border-dark-600' : 'border-dark-600 opacity-60'}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-accent-green' : 'bg-gray-600'}`} />
      <span className={`flex-1 text-sm font-medium ${active ? 'text-white' : 'text-gray-400'}`}>
        {keyword.word}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(keyword.id, active ? 0 : 1)}
          className="text-xs px-2 py-1 rounded-md bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 transition-colors"
        >
          {active ? '暂停' : '恢复'}
        </button>
        <button
          onClick={() => onDelete(keyword.id)}
          className="text-xs px-2 py-1 rounded-md bg-dark-600 text-gray-500 hover:text-accent-red hover:bg-dark-500 transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  );
}
