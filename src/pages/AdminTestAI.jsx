import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User, Loader2, Globe, Zap, Cpu, Sparkles, Wind } from 'lucide-react';

const AI_MODELS = [
  { id: 'grok', label: 'Grok (xAI)', icon: Zap, color: 'from-emerald-500 to-teal-600' },
  { id: 'openrouter', label: 'OpenRouter', icon: Globe, color: 'from-blue-500 to-indigo-600' },
  { id: 'gemini', label: 'Gemini (Google)', icon: Bot, color: 'from-yellow-500 to-orange-600' },
  { id: 'cerebras', label: 'Cerebras', icon: Cpu, color: 'from-purple-500 to-pink-600' },
  { id: 'mistral', label: 'Mistral AI', icon: Wind, color: 'from-orange-500 to-red-600' },
];

const AdminTestAI = () => {
  const { profile } = useAuth();
  const [selectedModel, setSelectedModel] = useState('grok');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const systemMessage = `You are "SuccessKart AI" — an educational assistant built by the SuccessKart team and trained by Sai Nani. When introducing yourself, ALWAYS say you are trained by Sainani. Keep responses concise and helpful.`;

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id || 'admin-test',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMsg },
          ],
          forceProvider: selectedModel,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, provider: data.provider }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Request failed'}${data.detail ? ': ' + data.detail : ''}`, isError: true }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Network error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-purple-300/20 shadow-2xl overflow-hidden flex flex-col" style={{ height: '85vh' }}>
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Test AI E K</h2>
                <p className="text-xs text-purple-400">Test each AI model individually</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition"
              >
                Clear Chat
              </button>
            )}
          </div>

          <div className="px-5 py-3 border-b border-white/10 flex gap-2 overflow-x-auto">
            {AI_MODELS.map((model) => {
              const Icon = model.icon;
              return (
                <button
                  key={model.id}
                  onClick={() => { setSelectedModel(model.id); setMessages([]); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedModel === model.id
                      ? `bg-gradient-to-r ${model.color} text-white shadow-lg`
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {model.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Sparkles size={40} className="text-purple-400 mb-3" />
                <p className="text-sm font-medium">Select an AI model and send a test message</p>
                <p className="text-xs text-slate-500 mt-1">Each model will respond as SuccessKart AI</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : msg.isError
                      ? 'bg-red-900/50 text-red-200 border border-red-500/30 rounded-bl-md'
                      : 'bg-white/10 text-white rounded-bl-md'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' && msg.provider && (
                      <span className="text-[10px] uppercase tracking-wider text-purple-400">
                        via {msg.provider}
                      </span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-purple-400" />
                    <span className="text-sm text-purple-300">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Test ${AI_MODELS.find(m => m.id === selectedModel)?.label || 'AI'}...`}
                className="flex-1 bg-white/10 border border-purple-400/30 rounded-xl px-4 py-3 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTestAI;
