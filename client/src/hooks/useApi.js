import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api';

export async function apiFetch(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export function useSSE(url = '/api/events') {
  const [lastEvent, setLastEvent] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(url);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type !== 'connected') {
          setLastEvent(data);
        }
      } catch {}
    };
    return () => { source.close(); setConnected(false); };
  }, [url]);

  return { lastEvent, connected };
}
