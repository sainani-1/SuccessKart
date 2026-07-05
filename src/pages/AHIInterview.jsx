import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShieldOff, Maximize2, Minimize2, Mic, MicOff, Loader2, Volume2, AlertTriangle } from 'lucide-react';
import { getGroqApiKey, getAuthorizedUsers, callGroq, INTERVIEW_SYSTEM_PROMPT, INTERVIEW_QUESTIONS, INTERVIEW_ROUNDS } from '../utils/ahi';

const lipKeyframes = `
@keyframes lipMove {
  0%   { height: 1.5px; width: 18px; }
  15%  { height: 5px;   width: 22px; }
  30%  { height: 2px;   width: 20px; }
  45%  { height: 6px;   width: 24px; }
  60%  { height: 3px;   width: 19px; }
  75%  { height: 5px;   width: 22px; }
  90%  { height: 2px;   width: 20px; }
  100% { height: 1.5px; width: 18px; }
}
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AHIInterview = () => {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState('prompt'); // prompt → interview → done
  const [currentRound, setCurrentRound] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [answers, setAnswers] = useState([]);
  const [aiMessage, setAiMessage] = useState('');
  const [error, setError] = useState('');
  const [interviewId, setInterviewId] = useState(null);
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState('');
  const [score, setScore] = useState(null);
  const [authorized, setAuthorized] = useState(null); // null=loading, true/false
  const [profileId, setProfileId] = useState(null);
  const [onHold, setOnHold] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [resumeTimeout, setResumeTimeout] = useState(5);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const avatarRef = useRef(null);
  const fullscreenRef = useRef(null);
  const apiKeyRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      setProfileId(uid);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single();

      if (profileData?.role === 'admin') {
        setAuthorized(true);
      } else {
        const users = await getAuthorizedUsers();
        setAuthorized(Array.isArray(users) && users.some((u) => u.id === uid));
      }

      apiKeyRef.current = await getGroqApiKey();
    };
    init();
  }, []);

  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((t) => t.stop());
    } catch {
      setError('Microphone access is required for the interview. Please allow microphone permission and try again.');
      return;
    }
    try {
      const el = fullscreenRef.current;
      if (el?.requestFullscreen) {
        await el.requestFullscreen();
      }
      setIsFullscreen(true);
      setPhase('interview');
      setStarted(true);
    } catch {
      setError('Please allow fullscreen to start the interview.');
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    synthRef.current?.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setListening(false);
    setAiSpeaking(false);
  }, []);

  useEffect(() => {
    const onFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && started && phase === 'interview') {
        exitFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, [started, phase, exitFullscreen]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!started || phase !== 'interview') return;
      if (document.hidden) {
        synthRef.current?.cancel();
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }
        setListening(false);
        setAiSpeaking(false);
        setOnHold(true);
      } else if (onHold) {
        setTabSwitchWarning(true);
        let count = 5;
        setResumeTimeout(count);
        const timer = setInterval(() => {
          count--;
          setResumeTimeout(count);
          if (count <= 0) {
            clearInterval(timer);
            setTabSwitchWarning(false);
            setOnHold(false);
          }
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [started, phase, onHold, currentRound, currentQ]);

  useEffect(() => {
    if (started && phase === 'interview' && !onHold && currentRound < INTERVIEW_ROUNDS.length) {
      speakQuestion();
    }
  }, [started, phase, onHold, currentRound, currentQ]);

  const speakText = (text) => {
    return new Promise((resolve) => {
      synthRef.current?.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1;

      const voices = synthRef.current?.getVoices();
      const preferred = voices?.find((v) => v.name.includes('Google UK') || v.name.includes('Microsoft David') || v.name.includes('Male'));
      if (preferred) utterance.voice = preferred;

      setAiSpeaking(true);
      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => {
        setAiSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setAiSpeaking(false);
        resolve();
      };
      synthRef.current?.speak(utterance);
    });
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      if (final) setTranscript((prev) => prev + ' ' + final);
      if (interim) setInterimText(interim);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setListening(false);
    setInterimText('');
  };

  const speakQuestion = async () => {
    const round = INTERVIEW_ROUNDS[currentRound];
    const questions = INTERVIEW_QUESTIONS[round.key];
    if (!questions || currentQ >= questions.length) {
      if (currentRound + 1 < INTERVIEW_ROUNDS.length) {
        setCurrentRound(currentRound + 1);
        setCurrentQ(0);
        return;
      } else {
        finishInterview();
        return;
      }
    }

    const qText = questions[currentQ];
    setAiMessage(qText);
    await speakText(qText);
    setAnswers((prev) => [...prev, { round: round.key, question: qText, answer: '' }]);
    startListening();
  };

  const handleAnswerComplete = async () => {
    stopListening();
    const fullAnswer = (transcript + ' ' + interimText).trim();

    if (!fullAnswer) {
      setAiMessage('No answer detected. Moving to the next question...');
      await sleep(1500);
      setAnswers((prev) => {
        const updated = [...prev];
        const last = { ...updated[updated.length - 1], answer: '' };
        updated[updated.length - 1] = last;
        return updated;
      });
      setTranscript('');
      setInterimText('');
      setCurrentQ(currentQ + 1);
      return;
    }

    setAnswers((prev) => {
      const updated = [...prev];
      const last = { ...updated[updated.length - 1], answer: fullAnswer };
      updated[updated.length - 1] = last;
      return updated;
    });

    setTranscript('');
    setInterimText('');

    const ack = await generateAck(fullAnswer);
    if (ack) {
      setAiMessage(ack);
      await speakText(ack);
    }

    setCurrentQ(currentQ + 1);
  };

  const generateAck = async (answer) => {
    if (!apiKeyRef.current) return 'Thank you for your response.';
    try {
      const response = await callGroq(apiKeyRef.current, [
        { role: 'system', content: 'You are an AI interviewer. Acknowledge the candidate\'s answer briefly (1 sentence max) and signal you are moving to the next question. Keep it natural and encouraging.' },
        { role: 'user', content: `The candidate answered: "${answer}". Respond briefly.` },
      ]);
      return response || 'Thank you.';
    } catch {
      return 'Great, thank you.';
    }
  };

  const finishInterview = async () => {
    setPhase('done');
    exitFullscreen();

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const answerData = answers.map((a) => ({
        round: a.round,
        question: a.question,
        answer: a.answer,
      }));

      const { data: interview, error: insertErr } = await supabase
        .from('ahi_interviews')
        .insert({
          user_id: userId,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          rounds: INTERVIEW_ROUNDS.length,
          total_questions: answers.length,
          answers: answerData,
          status: 'completed',
        })
        .select()
        .single();

      if (!insertErr && interview) {
        setInterviewId(interview.id);
      }

      if (apiKeyRef.current) {
        const allAnswers = answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
        const evalResponse = await callGroq(apiKeyRef.current, [
          { role: 'system', content: 'You are an interview evaluator. Provide a brief summary (2-3 sentences) of the candidate\'s performance and a score from 1-100. Format: SUMMARY: ... SCORE: ...' },
          { role: 'user', content: `Interview transcript:\n${allAnswers}` },
        ]);

        if (evalResponse) {
          const scoreMatch = evalResponse.match(/SCORE:\s*(\d+)/i);
          const summaryMatch = evalResponse.match(/SUMMARY:\s*(.+?)(?:SCORE:|$)/is);
          const fullSummary = summaryMatch?.[1]?.trim() || evalResponse.slice(0, 200);
          const fullScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

          setSummary(fullSummary);
          setScore(fullScore);

          if (interview?.id && userId) {
            await supabase
              .from('ahi_interviews')
              .update({ summary: fullSummary, overall_score: fullScore })
              .eq('id', interview.id);
          }
        }
      }
    } catch {
      // evaluation failed silently
    }
  };

  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Volume2 size={28} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Interview Complete</h1>
              <p className="text-sm text-gray-500 mt-1">Thank you for completing the AI interview.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{INTERVIEW_ROUNDS.length}</p>
                <p className="text-xs text-gray-500">Rounds</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{answers.length}</p>
                <p className="text-xs text-gray-500">Questions</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{answers.filter((a) => a.answer).length}</p>
                <p className="text-xs text-gray-500">Answered</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${score ? (score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600') : 'text-gray-400'}`}>
                  {score ?? '-'}
                </p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
            </div>

            {summary && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">Summary</h3>
                <p className="text-sm text-blue-700">{summary}</p>
              </div>
            )}

            <div className="space-y-3 mb-8">
              {answers.map((a, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-400 uppercase">{a.round}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-500">Q{i + 1}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">{a.question}</p>
                  {a.answer ? (
                    <p className="text-sm text-gray-500">{a.answer}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No answer recorded</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate('/app')}
                className="px-6 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
              >
                Start New Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldOff size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 mb-4">
            You are not authorized to use the AI Interview feature.
            Contact an admin to request access.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="px-6 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{lipKeyframes}</style>
      <div ref={fullscreenRef} className={`${isFullscreen ? 'fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'min-h-screen bg-gray-50'}`}>
      {!isFullscreen && phase === 'prompt' && (
        <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Maximize2 size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">AI Human Interview</h1>
            <p className="text-sm text-gray-500 mb-6">
              You will have a conversation with <strong>Nani</strong>, your AI interviewer. This will take about 5-10 minutes.
              Fullscreen mode is required. Do not switch tabs or apps during the interview.
            </p>
            <div className="space-y-2 mb-6 text-left">
              {INTERVIEW_ROUNDS.map((r, i) => (
                <div key={r.key} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <div>
                    <p className="font-medium text-gray-700">{r.label}</p>
                    <p className="text-xs text-gray-400">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}
            <button
              onClick={enterFullscreen}
              className="w-full px-6 py-3 rounded-lg bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition flex items-center justify-center gap-2"
            >
              <Maximize2 size={18} />
              Enter Fullscreen & Start Interview
            </button>
            <button
              onClick={() => navigate('/app')}
              className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="h-full flex flex-col items-center justify-center px-4 py-8 text-white relative">
          {/* On Hold Overlay */}
          {onHold && !tabSwitchWarning && (
            <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-violet-400 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-white mb-1">Interview on Hold</h2>
              <p className="text-sm text-gray-400">Waiting for you to return...</p>
            </div>
          )}

          {/* Tab Switch Warning */}
          {tabSwitchWarning && (
            <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur flex flex-col items-center justify-center px-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Please Don't Switch Apps or Tabs</h2>
              <p className="text-sm text-gray-400 text-center max-w-md mb-6">
                Switching away during the interview is considered ungenuine behavior.
                Stay focused and complete the interview with integrity.
              </p>
              <div className="text-5xl font-bold text-violet-400 mb-2">{resumeTimeout}</div>
              <p className="text-xs text-gray-500">Resuming automatically...</p>
            </div>
          )}

          <div className="max-w-2xl w-full">
            {/* Video Call Frame */}
            <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden mb-6">
              {/* Top bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs text-gray-400 font-medium">Nani · AI Interviewer</span>
                <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-xs text-gray-400">
                  Round {currentRound + 1}/{INTERVIEW_ROUNDS.length}
                </span>
              </div>

              {/* Avatar Area - person silhouette like a video call */}
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="relative mb-4">
                  {/* Nani's photo with animated mouth */}
                  <div ref={avatarRef} className={`w-36 h-36 rounded-full overflow-hidden shadow-2xl transition-all duration-500 ${aiSpeaking ? 'shadow-violet-500/60 ring-2 ring-violet-300 ring-offset-2 ring-offset-slate-800' : ''} ${listening ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-800' : ''}`}>
                    <div className="relative w-full h-full">
                      <img
                        src="/nani-avatar.png"
                        alt="Nani"
                        className="w-full h-full object-cover"
                      />
                      {/* Animated mouth overlay */}
                      <div className="absolute inset-0 flex items-end justify-center pb-5">
                        <div className={`w-6 h-1.5 rounded-full bg-white transition-all duration-75 ${aiSpeaking ? 'animate-lip' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Status badges */}
                  {aiSpeaking && !onHold && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-500/20 backdrop-blur px-3 py-1 rounded-full border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-300 font-medium">Speaking</span>
                    </div>
                  )}
                  {listening && !onHold && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-blue-500/20 backdrop-blur px-3 py-1 rounded-full border border-blue-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-xs text-blue-300 font-medium">Listening</span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">Nani</h3>
                <p className="text-xs text-gray-400">AI Interviewer</p>

                {/* AI Thinking indicator */}
                {!aiSpeaking && !listening && !onHold && !tabSwitchWarning && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white/5">
                    <Loader2 size={12} className="animate-spin text-violet-400" />
                    <span className="text-xs text-violet-300">Processing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Question / AI Message */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 md:p-6 mb-4 min-h-[80px] flex items-center justify-center border border-white/5">
              {aiMessage ? (
                <p className="text-base md:text-lg text-white text-center leading-relaxed">{aiMessage}</p>
              ) : (
                <Loader2 size={24} className="animate-spin text-violet-400" />
              )}
            </div>

            {/* Your Answer Transcript */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 min-h-[60px] mb-6 border border-white/5">
              <p className="text-xs text-gray-500 mb-2 font-medium">Your Answer</p>
              {listening && interimText && (
                <p className="text-sm text-gray-300 italic">{interimText}</p>
              )}
              {transcript && (
                <p className="text-sm text-gray-400">{transcript}</p>
              )}
              {!listening && !transcript && (
                <p className="text-sm text-gray-500 italic">Speak your answer clearly into the microphone...</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {listening ? (
                <button
                  onClick={handleAnswerComplete}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition animate-pulse shadow-lg shadow-blue-500/25"
                >
                  <Mic size={18} />
                  Stop & Submit Answer
                </button>
              ) : aiSpeaking ? (
                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Nani is speaking...
                </div>
              ) : (
                <button
                  onClick={startListening}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/25"
                >
                  <Mic size={18} />
                  Start Speaking
                </button>
              )}
            </div>

            {/* End Interview */}
            <button
              onClick={() => {
                if (confirm('End interview early?')) {
                  finishInterview();
                }
              }}
              className="mt-8 mx-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 transition border border-white/5"
            >
              <Minimize2 size={14} />
              End Interview
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default AHIInterview;
