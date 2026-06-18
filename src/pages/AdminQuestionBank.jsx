import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Loader2, Upload, Plus, Trash2, FileText, Search, AlertCircle, CheckCircle, X } from 'lucide-react';

export default function AdminQuestionBank() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setQuestions(data || []);
    setLoading(false);
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('question_bank').insert({
      title: title.trim() || 'Untitled Question',
      content: content.trim(),
      created_by: profile?.id,
    });
    if (error) {
      showMsg('error', 'Failed to save question');
    } else {
      showMsg('success', 'Question added successfully');
      setTitle('');
      setContent('');
      setShowManualForm(false);
      fetchQuestions();
    }
    setSubmitting(false);
  };

  const parseBulkText = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    const parsed = [];
    let currentTitle = '';
    let currentContent = [];
    let questionCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      const qMatch = trimmed.match(/^(?:Question|Q)[\.\:\s]*(\d+)[\.\:\s]*(.*)/i);
      const numMatch = trimmed.match(/^(\d+)[\.\:\s\)]+(.+)/);

      if (qMatch) {
        if (currentContent.length && (currentTitle || currentContent.length)) {
          parsed.push({ title: currentTitle || `Question ${parsed.length + 1}`, content: currentContent.join('\n') });
        }
        currentTitle = qMatch[2]?.trim() || `Question ${qMatch[1]}`;
        currentContent = [];
        questionCount++;
      } else if (numMatch && numMatch[1] && (currentContent.length > 2 || parsed.length === 0)) {
        if (currentContent.length && (currentTitle || currentContent.length)) {
          parsed.push({ title: currentTitle || `Question ${parsed.length + 1}`, content: currentContent.join('\n') });
        }
        currentTitle = `Question ${numMatch[1]}`;
        currentContent = [trimmed];
        questionCount++;
      } else {
        if (!currentTitle && questionCount === 0) {
          if (!currentTitle) currentTitle = trimmed;
          else currentContent.push(trimmed);
        } else {
          currentContent.push(trimmed);
        }
      }
    }
    if (currentContent.length && (currentTitle || currentContent.length)) {
      parsed.push({ title: currentTitle || `Question ${parsed.length + 1}`, content: currentContent.join('\n') });
    }
    return parsed;
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    setSubmitting(true);
    const parsed = parseBulkText(bulkInput);
    if (!parsed.length) {
      showMsg('error', 'Could not parse any questions from the input');
      setSubmitting(false);
      return;
    }
    const inserts = parsed.map(q => ({
      title: q.title,
      content: q.content,
      created_by: profile?.id,
    }));
    const { error } = await supabase.from('question_bank').insert(inserts);
    if (error) {
      showMsg('error', 'Failed to save questions');
    } else {
      showMsg('success', `${inserts.length} questions added successfully`);
      setBulkInput('');
      setShowBulkForm(false);
      fetchQuestions();
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setBulkInput(text);
    setShowBulkForm(true);
    setShowManualForm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    const { error } = await supabase.from('question_bank').delete().eq('id', id);
    if (error) {
      showMsg('error', 'Failed to delete question');
    } else {
      showMsg('success', 'Question deleted');
      fetchQuestions();
    }
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Question Bank
            </h1>
            <p className="text-slate-400 mt-1">Add and manage questions for students</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowManualForm(!showManualForm); setShowBulkForm(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                showManualForm ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Plus size={20} />
              Add Manually
            </button>
            <button
              onClick={() => { setShowBulkForm(!showBulkForm); setShowManualForm(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                showBulkForm ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Upload size={20} />
              Bulk Upload
            </button>
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
            message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="text-sm font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto"><X size={16} /></button>
          </div>
        )}

        {showManualForm && (
          <form onSubmit={handleManualSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-cyan-300">Add Question Manually</h2>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Question Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Algebra Basics - Question 1"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Question Content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                placeholder="Enter the question content here..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowManualForm(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-medium text-white hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                Save Question
              </button>
            </div>
          </form>
        )}

        {showBulkForm && (
          <form onSubmit={handleBulkSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-cyan-300">Bulk Upload Questions</h2>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv,.md,.html,.json,.pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  <FileText size={18} />
                  Choose File
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Paste or upload file content. Questions can be separated by numbers (1., 2., etc.) or &quot;Question N:&quot; format.
            </p>
            <textarea
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              rows={12}
              placeholder={`Paste your questions here...\n\nExample:\nQuestion 1: What is React?\nReact is a JavaScript library for building UIs.\n\nQuestion 2: What is JSX?\nJSX is a syntax extension for JavaScript.`}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowBulkForm(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !bulkInput.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-medium text-white hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                Upload Questions
              </button>
            </div>
          </form>
        )}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 md:p-6 border-b border-white/10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-lg font-semibold">
                All Questions <span className="text-slate-500 text-sm font-normal">({questions.length})</span>
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-cyan-400" />
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No questions yet</p>
              <p className="text-sm mt-1">Add questions manually or upload a file to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 md:p-6 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded-md">#{questions.length - idx}</span>
                        <h3 className="font-semibold text-white truncate">{q.title}</h3>
                      </div>
                      <p className="text-slate-400 text-sm whitespace-pre-wrap line-clamp-3">{q.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                        <span>{new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(q.id)}
                      disabled={deleting === q.id}
                      className="flex-shrink-0 p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {deleting === q.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
