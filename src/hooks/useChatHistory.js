import { useState, useEffect, useCallback } from 'react';

const DEFAULT_WELCOME = {
  role: 'assistant',
  content: '',
  timestamp: new Date(),
};

export function useChatHistory(storageKey, welcomeMessage, maxMessages = 200) {
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
        }
      }
    } catch {}
    return [{ ...DEFAULT_WELCOME, content: welcomeMessage }];
  });

  useEffect(() => {
    try {
      const toStore = messages.slice(-maxMessages);
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch {}
  }, [messages, storageKey, maxMessages]);

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([{ ...DEFAULT_WELCOME, content: welcomeMessage }]);
    try { localStorage.removeItem(storageKey); } catch {}
  }, [welcomeMessage, storageKey]);

  return { messages, setMessages, addMessage, clearHistory };
}
