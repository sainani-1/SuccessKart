import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, Brain, Sparkles, Target, Volume2, VolumeX, RefreshCw, Send, User, StopCircle, CheckCircle, Lock, ShoppingCart } from 'lucide-react';

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
const STORAGE_KEY = 'talk_mock_interview_state';
const SILENCE_TIMEOUT = 1800;

const SYSTEM_PROMPT = `You are an expert interview coach conducting a live voice-based practice interview for SuccessKart students.

YOUR JOB:
1. The student has already told you their target role. Start by asking the first interview question.
2. Ask relevant interview questions ONE AT A TIME. Wait for the student's answer before asking the next.
3. After each answer, give VERY BRIEF verbal feedback (1-2 sentences) then ask the next question.
4. Ask exactly 10 questions total.
5. Make your responses conversational and natural since this is a voice interview.
6. Mix technical questions, behavioral questions, and problem-solving based on their role.
7. After the final question and answer, provide a complete assessment with:
   - Overall readiness score out of 100
   - Key strengths (2-3 bullet points)
   - Areas to improve (2-3 bullet points)
   - Final recommendation

GUIDELINES:
- Ask real interview questions commonly asked for the given role
- Keep your responses concise (each response under 150 words unless giving assessment)
- Be encouraging but honest in feedback
- Use simple, clear language suitable for speaking aloud`;

const stripMarkdown = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[-*]\s/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

const TalkMockInterviews = () => {
  const { profile, isPremiumPlus } = useAuth();
  const navigate = useNavigate();
  const isPp = profile ? isPremiumPlus(profile) : false;
  const [phase, setPhase] = useState('role');
  const [role, setRole] = useState('');
  const [messages, setMessages] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [inputFallback, setInputFallback] = useState('');
  const [userResponseCount, setUserResponseCount] = useState(0);
  const [savedState, setSavedState] = useState(null);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [accessCheck, setAccessCheck] = useState({ loading: true, granted: false });

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputFallbackRef = useRef(null);
  const responseCountRef = useRef(0);
  const autoListenRef = useRef(false);
  const phaseRef = useRef(phase);
  const loadingRef = useRef(loading);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognition) setSpeechSupported(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSpeech, interimText]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.phase === 'interview' && parsed.messages?.length) {
          setSavedState(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

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
      .select('talk_mock_enabled')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data, error }) => {
        clearTimeout(timeout);
        const granted = !error && data?.talk_mock_enabled === true;
        setAccessCheck({ loading: false, granted });
      })
      .catch(() => {
        clearTimeout(timeout);
        setAccessCheck({ loading: false, granted: false });
      });
  }, [profile?.id]);

  useEffect(() => {
    if (phase === 'interview' && questionCount > 0) {
      const data = {
        phase,
        role,
        messages,
        questionCount,
        userResponseCount,
        responseCount: responseCountRef.current,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else if (phase !== 'interview') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [phase, questionCount, messages, role, userResponseCount]);

  const speak = useCallback((text, onDone) => {
    if (!ttsEnabled) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = stripMarkdown(text);
    const truncated = clean.length > 600 ? clean.slice(0, 597) + '...' : clean;
    const utterance = new SpeechSynthesisUtterance(truncated);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onDone?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onDone?.();
    };
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      setError('Microphone access is required. Please allow microphone access in your browser settings and try again.');
      return false;
    }
  };

  const startInterview = async (roleValue) => {
    setError('');
    const permitted = await requestMicPermission();
    if (!permitted) return;

    setPhase('interview');
    setQuestionCount(0);
    setMessages([]);
    setUserResponseCount(0);
    responseCountRef.current = 0;
    setSavedState(null);

    setLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `My target role is ${roleValue}. Start the interview.` },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start interview');

      setMessages([{ role: 'assistant', content: data.reply }]);
      setQuestionCount(1);
      speak(data.reply, () => {
        if (phaseRef.current === 'interview') {
          setTimeout(() => startListening(), 600);
        }
      });
    } catch (err) {
      setError(err.message);
      setPhase('role');
    } finally {
      setLoading(false);
    }
  };

  const sendToAI = async (userText) => {
    const updatedCount = responseCountRef.current + 1;
    responseCountRef.current = updatedCount;
    setUserResponseCount(updatedCount);

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);
    setError('');

    const nextQuestionNum = questionCount + 1;
    const isLast = nextQuestionNum > TOTAL_QUESTIONS;

    if (isLast) {
      setPhase('completed');
      incrementVMIUsage(profile?.id, 'talk_mock');
      if (updatedCount < TOTAL_QUESTIONS) {
        setAssessment({
          score: 0,
          raw: 'You did not complete all questions. Please answer all 10 questions to receive a score.',
          incomplete: true,
        });
        setLoading(false);
        return;
      }
    }

    try {
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText },
      ];

      if (isLast) {
        apiMessages.push({
          role: 'user',
          content: 'That was my final answer. Now provide my complete interview assessment with a score out of 100, key strengths, areas to improve, and a final recommendation.',
        });
      }

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id, messages: apiMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

      if (isLast) {
        setAssessment(parseAssessment(data.reply));
        speak(data.reply);
      } else {
        setQuestionCount(nextQuestionNum);
        speak(data.reply, () => {
          if (phaseRef.current === 'interview') {
            setTimeout(() => startListening(), 600);
          }
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserResponse = useCallback((text) => {
    sendToAI(text);
  }, [messages, questionCount]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || loadingRef.current) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    stopSpeaking();
    setError('');
    setPendingTranscript('');
    setInterimText('');
    setIsListening(true);
    setCurrentSpeech('');

    finalTranscriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let interim = '';
      let hasFinal = false;
      let finalText = finalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += (finalText ? ' ' : '') + event.results[i][0].transcript;
          hasFinal = true;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      finalTranscriptRef.current = finalText;
      setInterimText(interim);
      setCurrentSpeech(finalText);

      if (hasFinal) {
        silenceTimerRef.current = setTimeout(() => {
          try { recognition.stop(); } catch {}
        }, SILENCE_TIMEOUT);
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);
      setInterimText('');
      const transcript = finalTranscriptRef.current.trim();
      if (transcript) {
        setCurrentSpeech(transcript);
        setPendingTranscript(transcript);
      } else {
        setCurrentSpeech('');
      }
    };

    recognition.onerror = (event) => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);
      setInterimText('');
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setCurrentSpeech('');
        return;
      }
      setError('Microphone error: ' + event.error);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError('Failed to start microphone');
    }
  }, [SpeechRecognition, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleMic = useCallback(() => {
    if (isListening) stopListening();
    else {
      setPendingTranscript('');
      setCurrentSpeech('');
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const submitTranscript = useCallback(() => {
    const text = pendingTranscript.trim();
    if (!text || loading) return;
    setPendingTranscript('');
    setCurrentSpeech('');
    sendToAI(text);
  }, [pendingTranscript, loading, messages, questionCount]);

  const parseAssessment = (text) => {
    const scoreMatch = text.match(/(\d{1,3})\s*\/\s*100/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
    return { score, raw: text };
  };

  const reset = () => {
    stopSpeaking();
    stopListening();
    localStorage.removeItem(STORAGE_KEY);
    setPhase('role');
    setRole('');
    setMessages([]);
    setQuestionCount(0);
    setAssessment(null);
    setError('');
    setCurrentSpeech('');
    setInterimText('');
    setPendingTranscript('');
    setUserResponseCount(0);
    responseCountRef.current = 0;
    setSavedState(null);
  };

  const sendFallback = () => {
    const text = inputFallback.trim();
    if (!text || loading) return;
    setInputFallback('');
    sendToAI(text);
  };

  const handleFallbackKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFallback();
    }
  };

  const resumeInterview = () => {
    if (!savedState) return;
    setPhase('interview');
    setRole(savedState.role || '');
    setMessages(savedState.messages || []);
    setQuestionCount(savedState.questionCount || 0);
    setUserResponseCount(savedState.userResponseCount || 0);
    responseCountRef.current = savedState.responseCount || 0;
    setSavedState(null);
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
              Talk Mock Interviews is a restricted feature. You need approval from the SuccessKart team to access it.
            </p>

            {isPp ? (
              <div className="mt-6 rounded-xl bg-indigo-900/30 border border-indigo-500/30 p-4 text-left text-sm text-indigo-300 space-y-3">
                <p>This feature is available as an add-on for Premium Plus members.</p>
                <p>Go to the Add-Ons page to purchase access for Voice Mock Interviews and AI Prep.</p>
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
                <p className="mt-1 text-sm text-amber-200/70">Only Premium Plus members can request access to Talk Mock Interviews.</p>
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
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">Talk Mock Interviews</h1>
                <p className="text-sm text-indigo-300">
                  {phase === 'role' && 'Voice-based AI mock interview practice'}
                  {phase === 'interview' && `Question ${questionCount} of ${TOTAL_QUESTIONS}`}
                  {phase === 'completed' && 'Interview complete!'}
                </p>
              </div>
              {phase === 'interview' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTtsEnabled((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-300 text-xs transition-colors"
                    title={ttsEnabled ? 'Mute voice' : 'Enable voice'}
                  >
                    {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
                    title="Stop and go back"
                  >
                    <StopCircle size={16} /> Stop
                  </button>
                </div>
              )}
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
              <h2 className="mt-6 text-2xl font-bold text-white">Voice Mock Interview</h2>
              <p className="mt-3 text-indigo-300 max-w-md mx-auto">
                Speak naturally with AI. The mic opens automatically after each question. You will be asked 10 role-specific questions and get a readiness score with detailed feedback.
              </p>
              {!speechSupported && (
                <p className="mt-3 text-amber-400 text-sm bg-amber-400/10 rounded-xl p-3 max-w-md mx-auto">
                  Your browser does not support speech recognition. Please use Chrome or Edge for the best experience.
                </p>
              )}
              <div className="mt-8 max-w-sm mx-auto">
                {savedState ? (
                  <div className="space-y-4">
                    <p className="text-indigo-300 text-sm">
                      You have an incomplete interview saved for <strong className="text-white">{savedState.role}</strong> (question {savedState.questionCount} of {TOTAL_QUESTIONS}).
                    </p>
                    <button
                      type="button"
                      onClick={resumeInterview}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Brain size={22} /> Resume Interview
                    </button>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && startInterview(role.trim())}
                        placeholder="New role to start fresh..."
                        className="flex-1 bg-white/10 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => startInterview(role.trim())}
                        disabled={!role.trim() || loading}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-semibold"
                      >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'New'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && startInterview(role.trim())}
                      placeholder="Target role (e.g. Frontend Developer)"
                      className="w-full bg-white/10 border border-indigo-400/30 rounded-xl px-5 py-4 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg text-center"
                    />
                    <button
                      type="button"
                      onClick={() => startInterview(role.trim())}
                      disabled={!role.trim() || loading}
                      className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={22} className="animate-spin" /> : <><Sparkles size={22} /> Start Voice Interview</>}
                    </button>
                  </>
                )}
              </div>
              {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </div>
          )}

          {(phase === 'interview' || phase === 'completed') && (
            <div className="flex flex-col h-[560px]">
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
                      className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-7 whitespace-pre-line ${
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
                {/* Live interim speech while listening */}
                {isListening && (
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[85%] rounded-2xl px-5 py-3 text-sm bg-indigo-600/60 text-indigo-100 rounded-br-md border border-indigo-400/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-indigo-300 font-medium">Recording...</span>
                      </div>
                      {currentSpeech || interimText ? (
                        <span>
                          <span className="text-white">{currentSpeech}</span>
                          {interimText && <span className="text-indigo-400/70">{interimText}</span>}
                          <span className="animate-pulse text-indigo-400/60">|</span>
                        </span>
                      ) : (
                        <span className="text-indigo-400/60 italic">Speak now...</span>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/60">
                        <User size={18} className="text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending transcript waiting for user to submit */}
                {!isListening && pendingTranscript && (
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[85%] rounded-2xl px-5 py-3 text-sm bg-indigo-600 text-white rounded-br-md">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-indigo-200 font-medium">You said:</span>
                      </div>
                      <p className="whitespace-pre-line">{pendingTranscript}</p>
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600">
                        <User size={18} className="text-white" />
                      </div>
                    </div>
                  </div>
                )}
                {loading && !isListening && (
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
                {isSpeaking && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
                        <Brain size={18} className="text-white" />
                      </div>
                    </div>
                    <div className="rounded-2xl px-5 py-2 bg-white/10 border border-indigo-400/20 rounded-bl-md">
                      <div className="flex items-center gap-2 text-indigo-300 text-xs">
                        <Volume2 size={14} className="animate-pulse" />
                        AI is speaking...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {phase === 'interview' && (
                <div className="border-t border-indigo-400/20 px-6 py-4">
                  <div className="flex gap-3 items-center">
                    {/* Mic toggle */}
                    <button
                      type="button"
                      onClick={toggleMic}
                      disabled={loading || !!pendingTranscript}
                      className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all flex-shrink-0 ${
                        isListening
                          ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/40 scale-110'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'
                      } disabled:opacity-50`}
                      title={isListening ? 'Stop recording' : 'Click and speak your answer'}
                    >
                      {isListening ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
                      {isListening && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 animate-ping" />
                      )}
                    </button>

                    {/* Status text or submit button */}
                    <div className="flex-1 min-w-0">
                      {pendingTranscript ? (
                        <button
                          type="button"
                          onClick={submitTranscript}
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle size={20} /> Completed Speaking — Analyze Answer</>}
                        </button>
                      ) : (
                        <p className="text-xs text-indigo-400">
                          {isListening
                            ? 'Speak now... auto-detects when you finish speaking'
                            : loading
                              ? 'Waiting for AI response...'
                              : isSpeaking
                                ? 'AI is speaking...'
                                : 'Mic opens automatically after AI speaks'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Text fallback for unsupported browsers */}
                  {!speechSupported && !pendingTranscript && (
                    <div className="mt-3 flex gap-2">
                      <input
                        ref={inputFallbackRef}
                        type="text"
                        value={inputFallback}
                        onChange={(e) => setInputFallback(e.target.value)}
                        onKeyDown={handleFallbackKey}
                        placeholder="Type your answer..."
                        disabled={loading}
                        className="flex-1 bg-white/10 border border-indigo-400/30 rounded-xl px-4 py-2.5 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={sendFallback}
                        disabled={!inputFallback.trim() || loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl disabled:opacity-50"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  )}
                  {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                </div>
              )}

              {phase === 'completed' && assessment && (
                <div className="border-t border-indigo-400/20 px-6 py-5">
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-400/30 p-6">
                    {assessment.incomplete ? (
                      <div className="text-center py-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 border-2 border-red-500/40">
                          <span className="text-3xl font-bold text-red-400">0</span>
                        </div>
                        <span className="block text-xs font-semibold text-indigo-300 mt-1">/100</span>
                        <p className="mt-4 text-red-400 font-semibold">Interview Incomplete</p>
                        <p className="mt-2 text-sm text-indigo-300">You must answer all {TOTAL_QUESTIONS} questions to receive a score. You answered {userResponseCount} of {TOTAL_QUESTIONS}.</p>
                      </div>
                    ) : (
                      <>
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
                              {assessment.score >= 80 ? 'Well prepared for interviews!' :
                               assessment.score >= 60 ? 'On the right track. Keep practicing.' :
                               'Needs more practice. Focus on the areas below.'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-slate-700">
                          <div
                            className={`h-2 rounded-full transition-all duration-1000 ${
                              assessment.score >= 80 ? 'bg-emerald-500' : assessment.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(assessment.score ?? 0, 100)}%` }}
                          />
                        </div>
                        <div className="mt-5 rounded-xl bg-white/5 p-4 text-sm text-indigo-200 leading-7 whitespace-pre-line max-h-32 overflow-y-auto">
                          {assessment.raw}
                        </div>
                      </>
                    )}
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

export default TalkMockInterviews;
