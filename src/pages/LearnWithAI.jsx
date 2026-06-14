import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bot, User, Send, Crown, AlertTriangle, Loader2, Brain, Sparkles, CheckCircle, Lightbulb, BookOpen, GraduationCap, Code, Terminal, Search, MoreVertical, Trash2 } from 'lucide-react';
import { buildPlanCheckoutPath } from '../utils/planCheckout';

const SYSTEM_PROMPT = `You are "SucessKart AI" — a friendly, educational assistant built by the SucessKart team and trained by Sai Nani. Your purpose is to help students learn by answering academic and career-related questions.

RULES:
1. Only answer education, learning, and career-related questions.
2. If a user asks about who created you, tell them: "I was built by the SucessKart team and trained by Sai Nani."
3. If you are asked who you are, respond: "I am SucessKart AI, an educational assistant created by the SucessKart team and trained by Sai Nani."
4. If a user asks anything harmful, unethical, or non-educational (like how to cheat, hack, or inappropriate content), politely decline and redirect to educational topics.
5. Keep responses clear, encouraging, and student-friendly.
6. Use simple language suitable for students.
7. Be concise but helpful.
8. Always maintain a positive and supportive tone.`;

const SUGGESTIONS = [
  { icon: Lightbulb, text: 'Explain quantum physics simply' },
  { icon: BookOpen, text: 'How to study effectively?' },
  { icon: GraduationCap, text: 'Tips for exam prep' },
  { icon: Code, text: 'What is machine learning?' },
];

const formatAIResponse = (text) => {
  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${codeKey++}`} className="my-2 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
              <Terminal size={12} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 font-mono">code</span>
              <button
                onClick={() => navigator.clipboard.writeText(codeContent.trim())}
                className="ml-auto text-[10px] text-slate-400 hover:text-slate-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-xs font-mono text-slate-800 leading-relaxed">
              <code>{codeContent.trim()}</code>
            </pre>
          </div>
        );
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeContent = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">{line.replace('### ', '')}</h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-slate-800 mt-4 mb-1.5">{line.replace('## ', '')}</h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg font-bold text-slate-800 mt-4 mb-2">{line.replace('# ', '')}</h1>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700 ml-1 py-0.5">
          <span className="text-emerald-500 mt-0.5 flex-shrink-0">\u2022</span>
          <span>{renderInline(line.replace(/^[-*] /, ''))}</span>
        </li>
      );
    } else if (/^\d+[.)] /.test(line)) {
      elements.push(
        <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700 ml-1 py-0.5">
          <span className="text-emerald-500 font-medium flex-shrink-0 w-4">{line.match(/^\d+/)[0]}.</span>
          <span>{renderInline(line.replace(/^\d+[.)] /, ''))}</span>
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-slate-700 leading-relaxed">{renderInline(line)}</p>
      );
    }
  }

  return elements;
};

const renderInline = (text) => {
  const parts = [];
  let remaining = text;

  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold text-slate-900">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 bg-slate-100 rounded text-emerald-600 font-mono text-xs border border-slate-200">
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const AnimatedDots = () => (
  <span className="inline-flex items-center gap-0.5 ml-1">
    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </span>
);

const TypingIndicator = () => (
  <div className="flex justify-start items-end gap-2 animate-in">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-sm">
      <Bot size={14} className="text-white" />
    </div>
    <div className="bg-white text-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm max-w-[75%]">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-700 font-medium">SucessKart Is Typing</span>
        <AnimatedDots />
      </div>
    </div>
  </div>
);

const LearnWithAI = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('learn_with_ai_messages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(10);
  const [dailyRemaining, setDailyRemaining] = useState(100);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState(0);
  const messagesEndRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    setSearchQuery('');
    setSearchResults([]);
    setSearchIndex(0);
    if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const results = [];
    messages.forEach((msg, idx) => {
      if (msg.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(idx);
      }
    });
    setSearchResults(results);
    setSearchIndex(0);
    if (results.length > 0) scrollToMessage(results[0]);
  };

  const scrollToMessage = (idx) => {
    const el = document.getElementById(`msg-${idx}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const navigateSearch = (dir) => {
    if (searchResults.length === 0) return;
    const next = (searchIndex + dir + searchResults.length) % searchResults.length;
    setSearchIndex(next);
    scrollToMessage(searchResults[next]);
  };

  const clearChat = () => {
    setMessages([]);
    setRemaining(null);
    setShowMenu(false);
    try { sessionStorage.removeItem('learn_with_ai_messages'); } catch {}
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const inputRef = useRef(null);

  const premiumPlusActive = profile?.premium_plan_type === 'premium_plus' ||
    profile?.role === 'admin' || profile?.role === 'teacher';

  useEffect(() => {
    try {
      sessionStorage.setItem('learn_with_ai_messages', JSON.stringify(messages.slice(-50)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (rateLimited && rateLimitRetryAfter > 0) {
      const timer = setInterval(() => {
        setRateLimitRetryAfter((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimited, rateLimitRetryAfter]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading || rateLimited) return;

    const userMessage = input.trim();
    setInput('');

    const chatMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const userMsg = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai-grok-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatMessages,
            { role: 'user', content: userMessage },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          setRateLimited(true);
          setRateLimitRetryAfter(retryAfter);
          setMessages((prev) => [...prev, { role: 'assistant', content: `\u23F3 Rate limit reached. Please try again in ${retryAfter} seconds.`, timestamp: new Date().toISOString(), isError: true }]);
          return;
        }
        const errMsg = data.detail ? `${data.error}: ${data.detail}` : (data.error || 'Something went wrong. Please try again.');
        setMessages((prev) => [...prev, { role: 'assistant', content: errMsg, timestamp: new Date().toISOString(), isError: true }]);
        return;
      }

      setRemaining(data.remaining);
      setDailyRemaining(data.dailyRemaining);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, timestamp: new Date().toISOString() }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please check your connection.', timestamp: new Date().toISOString(), isError: true }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  if (!premiumPlusActive) {
    return (
      <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
        <div className="relative max-w-lg w-full">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <Crown size={40} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Premium Plus</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Unlock the full power of <span className="text-emerald-600 font-semibold">Learn with AI</span> available exclusively to Premium Plus members.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left space-y-3">
              {[
                'AI-Powered Learning Assistant',
                'Instant academic answers',
                'Study tips & exam prep',
                'Priority support',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={12} className="text-emerald-600" />
                  </div>
                  <span className="text-slate-600">{benefit}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(buildPlanCheckoutPath('premium_plus'))}
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300"
            >
              Upgrade to Premium Plus
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative box-border">
      {/* Header */}
      <div className="p-3 border-b shrink-0 bg-white flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-sm">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800">SucessKart AI</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {remaining !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <Sparkles size={11} className="text-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-600">{remaining}m / {dailyRemaining}d</span>
            </div>
          )}
          <button onClick={toggleSearch} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors" title="Search">
            <Search size={16} className={`${showSearch ? 'text-emerald-500' : 'text-slate-400'}`} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <MoreVertical size={16} className="text-slate-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 animate-in">
                <button
                  onClick={clearChat}
                  disabled={messages.length === 0}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={15} className="text-slate-400" />
                  Clear chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 animate-in">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 border-0"
              onKeyDown={(e) => { if (e.key === 'Enter') navigateSearch(1); if (e.key === 'Escape') toggleSearch(); }}
            />
          </div>
          {searchQuery && (
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              {searchResults.length > 0 ? `${searchIndex + 1} of ${searchResults.length}` : '0 results'}
            </span>
          )}
          {searchResults.length > 0 && (
            <>
              <button onClick={() => navigateSearch(-1)} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button onClick={() => navigateSearch(1)} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </>
          )}
          <button onClick={toggleSearch} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-medium">Esc</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0 bg-[#e8f4f8]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg flex items-center justify-center mb-3">
              <Brain size={32} className="text-white" />
            </div>
            <p className="text-sm font-medium text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-400">Ask a question to start learning with AI</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isLastOfDay = idx === messages.length - 1 ||
              new Date(msg.timestamp).toDateString() !== new Date(messages[idx + 1]?.timestamp).toDateString();
            const isFirstOfDay = idx === 0 ||
              new Date(msg.timestamp).toDateString() !== new Date(messages[idx - 1]?.timestamp).toDateString();
            return (
              <React.Fragment key={idx}>
                {isFirstOfDay && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] bg-white/80 text-slate-500 px-3 py-1 rounded-full shadow-sm">
                      {new Date(msg.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
                <div id={`msg-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in ${searchQuery && msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ? 'ring-2 ring-emerald-400 rounded-xl' : ''}`}>
                  <div className={`max-w-[75%] px-3.5 py-2.5 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-br-md'
                      : msg.isError
                        ? 'bg-red-50 text-red-700 rounded-2xl rounded-bl-md border border-red-200'
                        : 'bg-white text-slate-900 rounded-2xl rounded-bl-md'
                  }`}>
                    {msg.role === 'assistant' && !msg.isError ? (
                      <div className="space-y-0.5">{formatAIResponse(msg.content)}</div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    <div className={`flex items-center gap-1 mt-0.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[9px] text-slate-400">
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                      {msg.role === 'user' && (
                        <span className="text-[9px] text-slate-400 ml-0.5">{'\u2713'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        {loading && (
          <div className="pt-1">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Rate limit */}
      {rateLimited && (
        <div className="px-3 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">Rate limit reached. Wait {rateLimitRetryAfter}s before sending again.</p>
            <span className="ml-auto text-sm font-bold text-amber-600">{rateLimitRetryAfter}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-2 border-t bg-white shrink-0 px-3">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
            placeholder="Type a message"
            className="flex-1 border-0 rounded-lg px-3 py-2 text-sm bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
            disabled={loading || rateLimited}
            autoComplete="off"
            autoFocus
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || rateLimited || !input.trim()}
            className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      <div className="text-center px-3 py-1.5 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          SucessKart AI can make mistakes. Verify important information. <Link to="/terms-and-conditions" className="text-emerald-500 hover:text-emerald-600 underline">Terms apply</Link>.
        </p>
      </div>

      <style>{`
        @keyframes in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: in 0.15s ease-out; }
      `}</style>
    </div>
  );
};

export default LearnWithAI;
