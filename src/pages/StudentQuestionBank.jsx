import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { buildPlanCheckoutPath } from '../utils/planCheckout';
import { Search, Loader2, BookOpen, ChevronDown, ChevronUp, FileText, Award } from 'lucide-react';

export default function StudentQuestionBank() {
  const { profile, isPremiumPlus } = useAuth();
  const premiumPlusAccess = isPremiumPlus(profile);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

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

  if (profile?.role === 'student' && !premiumPlusAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-amber-500/20 bg-white/5 backdrop-blur-sm p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30">
            <Award size={32} className="text-amber-400" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white">Premium Plus Required</h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Question Bank is a Premium Plus feature. Upgrade to access thousands of practice questions.
          </p>
          <a
            href={buildPlanCheckoutPath('premium_plus')}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 font-semibold text-white hover:from-amber-400 hover:to-orange-500 transition-all"
          >
            {profile?.premium_plan_type === 'premium' ? 'Upgrade to Premium Plus' : 'Buy Premium Plus'}
          </a>
          <p className="mt-4 text-xs text-slate-600">
            Premium Plus unlocks unlimited questions, AI-powered tools, and more.
          </p>
        </div>
      </div>
    );
  }

  const filtered = questions.filter(q => {
    const qry = search.toLowerCase();
    return q.title.toLowerCase().includes(qry) || q.content.toLowerCase().includes(qry);
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Question Bank
          </h1>
          <p className="text-slate-400 mt-1">Browse and search through available questions</p>
        </div>

        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions by title or content..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">
            {filtered.length === 0
              ? 'No questions found'
              : `Showing ${filtered.length} of ${questions.length} question${questions.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={36} className="animate-spin text-cyan-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <BookOpen size={56} className="mb-4 opacity-30" />
            <p className="text-xl font-medium">{search ? 'No matching questions' : 'No questions available yet'}</p>
            <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Check back later for new questions'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20"
              >
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full flex items-center justify-between p-4 md:p-5 text-left gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-cyan-400">{questions.length - idx}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{q.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{q.content}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-slate-500">
                    {expandedId === q.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>
                {expandedId === q.id && (
                  <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-white/5">
                    <div className="mt-3 p-4 bg-white/[0.03] rounded-xl border border-white/5">
                      <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{q.content}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                      <FileText size={14} />
                      <span>Added on {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
