import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Bot, User, Send, Loader2, Brain, Sparkles, CheckCircle, Target, BarChart3, RefreshCw, ArrowRight, Lock, ShoppingCart } from 'lucide-react';

const incrementVMIUsage = async (userId, feature) => {
  if (!userId) return;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' });
    const month = formatter.format(now).slice(0, 7);
    const { data: existing } = await supabase
      .from('vmi_usage')
      .select('id, used_count')
      .eq('user_id', userId)
      .eq('feature', feature)
      .eq('month', month)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('vmi_usage')
        .update({ used_count: existing.used_count + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('vmi_usage')
        .insert({ user_id: userId, feature, used_count: 1, month });
    }
  } catch {}
};

const TOTAL_QUESTIONS = 10;

const SYSTEM_PROMPT = `You are an expert interview coach conducting a live practice interview for SuccessKart students.

YOUR JOB:
1. Start by asking the user what role they are preparing for (e.g., Frontend Developer, Backend Developer, App Developer, Data Analyst, Full Stack, etc.).
2. Then ask relevant interview questions ONE AT A TIME. Wait for the user's answer before asking the next.
3. After each answer, give VERY BRIEF feedback (1-2 sentences) then ask the next question.
4. Ask exactly 10 questions total (including the role question).
5. The frontend tracks question numbers. Just focus on asking good questions and giving feedback.
6. Mix technical questions, behavioral questions, and problem-solving based on their role.
7. After the final question and answer, provide a complete assessment with:
   - Overall readiness score out of 100
   - Key strengths (2-3 bullet points)
   - Areas to improve (2-3 bullet points)
   - Final recommendation

GUIDELINES:
- Ask real interview questions commonly asked for the given role
- Keep your responses concise (each response under 200 words unless giving the final assessment)
- Be encouraging but honest in feedback
- Use simple, clear language`;

const AIInterviewPrep = () => {
  const { profile, user, isPremiumPlus } = useAuth();
  const navigate = useNavigate();
  const isPp = profile ? isPremiumPlus(profile) : false;
  const [phase, setPhase] = useState('role');
  const [role, setRole] = useState('');
  const [messages, setMessages] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [accessCheck, setAccessCheck] = useState({ loading: true, granted: false });

  useEffect(() => {
    if (!profile?.id) {
      setAccessCheck({ loading: false, granted: false });
      return;
    }
    setAccessCheck((p) => ({ ...p, loading: true }));
    const timeout = setTimeout(() => {
      setAccessCheck({ loading: false, granted: false });
    }, 4000);
    supabase
      .from('vmi_access')
      .select('ai_prep_enabled')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data, error }) => {
        clearTimeout(timeout);
        const granted = !error && data?.ai_prep_enabled === true;
        setAccessCheck({ loading: false, granted });
      })
      .catch(() => {
        clearTimeout(timeout);
        setAccessCheck({ loading: false, granted: false });
      });
  }, [profile?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (phase === 'interview' || phase === 'completed') {
      inputRef.current?.focus();
    }
  }, [phase, loading]);

  const startInterview = async () => {
    const roleValue = role.trim();
    if (!roleValue) return;
    setError('');
    setPhase('interview');
    setQuestionCount(0);
    setMessages([]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `I want to practice for an interview. My target role is: ${roleValue}. Start the interview.` },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start interview');

      setMessages([
        { role: 'user', content: `Target role: ${roleValue}` },
        { role: 'assistant', content: data.reply },
      ]);
      setQuestionCount(1);
    } catch (err) {
      setError(err.message);
      setPhase('role');
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async () => {
    const answer = input.trim();
    if (!answer || loading) return;
    setInput('');
    setError('');

    const updatedMessages = [...messages, { role: 'user', content: answer }];
    setMessages(updatedMessages);
    setLoading(true);

    const nextQuestionNum = questionCount + 1;
    const isLastQuestion = nextQuestionNum > TOTAL_QUESTIONS;

    try {
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      if (isLastQuestion) {
        apiMessages.push({
          role: 'user',
          content: 'That was my final answer. Now please provide my complete interview assessment with a score out of 100, key strengths, areas to improve, and a final recommendation.',
        });
      }

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id, messages: apiMessages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      const newMessages = [...updatedMessages, { role: 'assistant', content: data.reply }];
      setMessages(newMessages);

      if (isLastQuestion) {
        setPhase('completed');
        setAssessment(parseAssessment(data.reply));
        incrementVMIUsage(profile?.id, 'ai_prep');
      } else {
        setQuestionCount(nextQuestionNum);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseAssessment = (text) => {
    const scoreMatch = text.match(/(\d{1,3})\s*\/\s*100/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
    return { score, raw: text };
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (phase === 'role') startInterview();
      else sendAnswer();
    }
  };

  const reset = () => {
    setPhase('role');
    setRole('');
    setMessages([]);
    setQuestionCount(0);
    setAssessment(null);
    setError('');
    setInput('');
  };

  const getProgressColor = () => {
    if (!assessment?.score) return 'bg-slate-300';
    if (assessment.score >= 80) return 'bg-emerald-500';
    if (assessment.score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (accessCheck.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!accessCheck.granted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-indigo-300/20 shadow-2xl p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <Lock size={36} className="text-white" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">Access Required</h2>
            <p className="mt-3 text-indigo-300 text-sm leading-relaxed">
              AI Interview Prep is a restricted feature. You need approval from the SuccessKart team to access it.
            </p>

            {isPp ? (
              <div className="mt-6 rounded-xl bg-indigo-900/30 border border-indigo-500/30 p-4 text-left text-sm text-indigo-300 space-y-3">
                <p>This feature is available as an add-on for Premium Plus members.</p>
                <p>Go to the Add-Ons page to purchase access for AI Interview Prep and Voice Mock Interviews.</p>
                <button
                  type="button"
                  onClick={() => navigate('/app/addons')}
                  className="mt-2 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} /> Go to Add-Ons
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 p-5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                  <Sparkles size={24} className="text-amber-400" />
                </div>
                <p className="mt-3 font-semibold text-amber-300">Upgrade to Premium Plus</p>
                <p className="mt-1 text-sm text-amber-200/70">Only Premium Plus members can request access to AI Interview Prep.</p>
                <a
                  href={profile ? `/checkout/premium_plus` : '/plans'}
                  className="mt-4 inline-block w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                >
                  Upgrade Now
                </a>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-indigo-300/20 shadow-2xl overflow-hidden">
          <div className="border-b border-indigo-400/20 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                <Target size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Interview Prep</h1>
                <p className="text-sm text-indigo-300">
                  {phase === 'role' && 'Practice with AI-powered mock interviews'}
                  {phase === 'interview' && `Question ${questionCount} of ${TOTAL_QUESTIONS}`}
                  {phase === 'completed' && 'Interview complete!'}
                </p>
              </div>
            </div>
            {phase === 'interview' && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${(questionCount / TOTAL_QUESTIONS) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-indigo-300">{questionCount}/{TOTAL_QUESTIONS}</span>
              </div>
            )}
          </div>

          {phase === 'role' && (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Brain size={32} className="text-white" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-white">Ready to practice?</h2>
              <p className="mt-3 text-indigo-300 max-w-md mx-auto">
                AI will ask you 10 role-specific interview questions and give you a readiness score with detailed feedback.
              </p>
              <div className="mt-8 max-w-sm mx-auto">
                <input
                  ref={inputRef}
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your target role (e.g. Frontend Developer)"
                  className="w-full bg-white/10 border border-indigo-400/30 rounded-xl px-5 py-4 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg text-center"
                />
                <button
                  type="button"
                  onClick={startInterview}
                  disabled={!role.trim() || loading}
                  className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={22} className="animate-spin" /> : <><Sparkles size={22} /> Start Interview</>}
                </button>
              </div>
              {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </div>
          )}

          {(phase === 'interview' || phase === 'completed') && (
            <div className="flex flex-col h-[520px]">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
                          <Brain size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-7 whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-white/10 text-indigo-100 border border-indigo-400/20 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600">
                          <User size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
                        <Brain size={18} className="text-white" />
                      </div>
                    </div>
                    <div className="rounded-2xl px-5 py-3 bg-white/10 text-indigo-300 border border-indigo-400/20 rounded-bl-md">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {phase === 'interview' && (
                <div className="border-t border-indigo-400/20 px-6 py-4">
                  <div className="flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your answer..."
                      disabled={loading}
                      className="flex-1 bg-white/10 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={sendAnswer}
                      disabled={!input.trim() || loading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                </div>
              )}

              {phase === 'completed' && assessment && (
                <div className="border-t border-indigo-400/20 px-6 py-5">
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-400/30 p-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 border-4 border-indigo-500">
                          <span className="text-3xl font-bold text-white">{assessment.score ?? '?'}</span>
                        </div>
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold text-indigo-300">/100</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Readiness Score</h3>
                        <p className="text-sm text-indigo-300 mt-1">
                          {assessment.score >= 80 ? 'Great shape! You are well prepared.' :
                           assessment.score >= 60 ? 'On the right track. Keep practicing.' :
                           'Needs more preparation. Focus on the areas below.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-700">
                      <div className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
                        style={{ width: `${Math.min(assessment.score ?? 0, 100)}%` }}
                      />
                    </div>
                    <div className="mt-5 rounded-xl bg-white/5 p-4 text-sm text-indigo-200 leading-7 whitespace-pre-line max-h-40 overflow-y-auto">
                      {assessment.raw}
                    </div>
                    <button
                      type="button"
                      onClick={reset}
                      className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} /> Practice Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInterviewPrep;
