import React, { useState } from 'react';

export default function KeywordManager({ keywords, onAdd, onDelete }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput('');
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-radar-card p-4">
      <h2 className="text-sm font-semibold text-radar-muted uppercase tracking-wider mb-3">
        关键词监控
      </h2>

      {/* 添加表单 */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入关键词..."
          className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-radar-text placeholder-gray-500 focus:border-radar-scan focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-radar-scan/20 px-3 py-2 text-sm font-medium text-radar-scan hover:bg-radar-scan/30 transition-colors"
        >
          添加
        </button>
      </form>

      {/* 关键词列表 */}
      <div className="space-y-2">
        {keywords.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">
            暂无关键词，添加一个开始监控
          </p>
        )}
        {keywords.map((kw) => (
          <div
            key={kw.id}
            className="flex items-center justify-between rounded-lg bg-gray-900/50 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${kw.is_active ? 'bg-radar-scan' : 'bg-gray-600'}`} />
              <span className="text-sm">{kw.word}</span>
            </div>
            <button
              onClick={() => onDelete(kw.id)}
              className="text-gray-500 hover:text-radar-danger transition-colors text-sm"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
