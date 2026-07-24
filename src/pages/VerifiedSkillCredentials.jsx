import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Award, CheckCircle, Search, Lock, Sparkles, Code, Brain, Palette, Cloud, BookOpen, Star, Clock, Copy, ChevronRight, ChevronLeft, Trophy, X, Download, Camera, AlertTriangle, Eye } from 'lucide-react';
import SKILL_EXAM_QUESTIONS from '../data/skillExamQuestions';
import { setExamMode } from '../data/examMode';
import { runCode } from '../logicBuilding/codeRunner';
import { TEMPLATES } from '../data/skillUpUtils';

const SKILL_CATEGORIES = [
  { id: 'programming', label: 'Programming', icon: Code, color: 'from-blue-500 to-indigo-500', skills: ['Python', 'JavaScript', 'Java', 'C++', 'TypeScript'] },
  { id: 'web_dev', label: 'Web Development', icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
  ), color: 'from-emerald-500 to-teal-500', skills: ['HTML/CSS', 'React.js', 'Node.js', 'Vue.js', 'Angular'] },
  { id: 'data', label: 'Data & AI', icon: Brain, color: 'from-amber-500 to-orange-500', skills: ['Machine Learning', 'Data Analysis', 'SQL', 'TensorFlow', 'Pandas'] },
  { id: 'cloud', label: 'Cloud & DevOps', icon: Cloud, color: 'from-sky-500 to-blue-500', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'] },
  { id: 'design', label: 'Design', icon: Palette, color: 'from-pink-500 to-fuchsia-500', skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop'] },
  { id: 'soft_skills', label: 'Soft Skills', icon: BookOpen, color: 'from-purple-500 to-violet-500', skills: ['Communication', 'Leadership', 'Problem Solving', 'Teamwork'] },
];

const PASS_THRESHOLD = 7;
const MAX_VIOLATIONS = 3;

const generateCredentialId = (userId, skill) => {
  let hash = 0;
  const seed = `${userId}-${skill}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) >>> 0;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SK-';
  for (let i = 0; i < 10; i++) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    id += chars[hash % chars.length];
  }
  return id;
};

const VerifiedSkillCredentials = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();

  const [credentials, setCredentials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(null);
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verifyId, setVerifyId] = useState('');
  const [verifiedResult, setVerifiedResult] = useState(null);

  const [examState, setExamState] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [codeAnswer, setCodeAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [examComplete, setExamComplete] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const [violations, setViolations] = useState(0);
  const [violationMsg, setViolationMsg] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [runningCode, setRunningCode] = useState(false);
  const [codeResult, setCodeResult] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (profile?.id) {
      const stored = localStorage.getItem(`skill_credentials_${profile.id}`);
      if (stored) {
        try { setCredentials(JSON.parse(stored)); } catch { setCredentials([]); }
      }
    }
  }, [profile?.id]);

  const saveCredentials = (newCreds) => {
    setCredentials(newCreds);
    if (profile?.id) {
      localStorage.setItem(`skill_credentials_${profile.id}`, JSON.stringify(newCreds));
    }
  };

  const addViolation = useCallback((msg) => {
    setViolations(prev => {
      const next = prev + 1;
      setViolationMsg(`${msg} (${next}/${MAX_VIOLATIONS} violations)`);
      if (next >= MAX_VIOLATIONS) {
        setTimeout(() => {
          setExamComplete(true);
          setExamResult({ correct: 0, total: 10, passed: false, reason: 'Exam terminated — too many proctoring violations.' });
        }, 500);
      }
      return next;
    });
  }, []);

  const startExam = async (skillName, category) => {
    const existing = credentials.find(c => c.skill === skillName);
    if (existing) return;

    const categoryQuestions = SKILL_EXAM_QUESTIONS[category]?.[skillName];
    if (!categoryQuestions || categoryQuestions.length === 0) return;

    const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10);

    setExamState({ skill: skillName, category });
    setExamQuestions(selected);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setCodeAnswer('');
    setAnswers([]);
    setExamComplete(false);
    setExamResult(null);
    setViolations(0);
    setViolationMsg('');
    setCodeResult(null);

    setExamMode(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      console.warn('Camera not available:', e);
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen not available:', e);
    }
  };

  useEffect(() => {
    if (!examState || examComplete) return;

    const handleVisibility = () => {
      if (document.hidden) addViolation('Tab switched');
    };
    const handleBlur = () => addViolation('Window lost focus');
    const handleKeyDown = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
          (e.ctrlKey && ['u', 's'].includes(e.key.toLowerCase())) || e.key === 'PrintScreen') {
        e.preventDefault();
        addViolation('Blocked key pressed');
      }
    };
    const handleContextMenu = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [examState, examComplete, addViolation]);

  useEffect(() => {
    if (examState && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [examState, cameraStream, currentQ]);

  const cleanupExam = useCallback(() => {
    setExamMode(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [cameraStream]);

  const handleRunCode = async () => {
    if (!examQuestions[currentQ] || runningCode) return;
    setRunningCode(true);
    setCodeResult(null);
    try {
      const q = examQuestions[currentQ];
      const testCases = q.testCases.map((tc, i) => ({
        input: tc.input,
        output: tc.expected,
        hidden: false,
        label: `Test ${i + 1}`,
      }));
      const res = await runCode(q.language === 'c++' ? 'cpp' : q.language, codeAnswer, testCases);
      const allPassed = res.every((r) => r.status === 'Accepted');
      setCodeResult({ passed: allPassed, tests: res });
    } catch (err) {
      setCodeResult({ passed: false, tests: [{ status: 'Error', error: err.message }] });
    }
    setRunningCode(false);
  };

  const handleAnswer = async () => {
    const q = examQuestions[currentQ];
    if (q.type === 'coding') {
      if (!codeResult) return;
      const newAnswers = [...answers, codeResult.passed ? 1 : 0];
      setAnswers(newAnswers);
    } else {
      if (selectedAnswer === null) return;
      const newAnswers = [...answers, selectedAnswer];
      setAnswers(newAnswers);
    }

    if (currentQ < examQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setCodeResult(null);
      if (examQuestions[currentQ + 1]?.type === 'coding') {
        setCodeAnswer(examQuestions[currentQ + 1]?.starterCode || '');
      } else {
        setCodeAnswer('');
      }
    } else {
      const allAnswers = [...answers, q.type === 'coding' ? (codeResult?.passed ? 1 : 0) : selectedAnswer];
      let correct = 0;
      allAnswers.forEach((a, i) => {
        const question = examQuestions[i];
        if (question.type === 'coding') {
          if (a === 1) correct++;
        } else {
          if (a === question.answer) correct++;
        }
      });
      const passed = correct >= PASS_THRESHOLD;
      setExamComplete(true);
      setExamResult({ correct, total: examQuestions.length, passed });

      if (passed) {
        const newCred = {
          id: generateCredentialId(profile.id, examState.skill),
          skill: examState.skill,
          category: examState.category,
          earnedAt: new Date().toISOString(),
          level: 'Verified',
          verifiedBy: 'SuccessKart Platform',
          userId: profile.id,
          userName: profile.full_name || profile.username || 'Student',
          verificationUrl: `${window.location.origin}/verify-credential/${generateCredentialId(profile.id, examState.skill)}`,
          examScore: correct,
        };
        saveCredentials([...credentials, newCred]);
      }
      cleanupExam();
    }
  };

  const closeExam = () => {
    cleanupExam();
    setExamState(null);
    setExamQuestions([]);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setCodeAnswer('');
    setAnswers([]);
    setExamComplete(false);
    setExamResult(null);
  };

  const copyCredentialId = (credId) => {
    navigator.clipboard.writeText(credId);
    setCopied(credId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerifyLookup = () => {
    if (!verifyId.trim()) return;
    const allStored = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('skill_credentials_')) {
        try { allStored.push(...JSON.parse(localStorage.getItem(key))); } catch {}
      }
    }
    setVerifiedResult(allStored.find(c => c.id === verifyId.trim()) || null);
  };

  const downloadCredential = (cred) => {
    const text = `VERIFIED SKILL CREDENTIAL\n=========================\nSuccessKart EdTech Platform\n\nCredential ID: ${cred.id}\nSkill: ${cred.skill}\nCategory: ${cred.category}\nLevel: ${cred.level}\nExam Score: ${cred.examScore || 'N/A'} / 10\nHolder: ${cred.userName}\nIssued: ${new Date(cred.earnedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}\nVerified By: ${cred.verifiedBy}\nVerify at: ${cred.verificationUrl}\n=========================\nThis credential is digitally verified by SuccessKart Platform.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkillCredential_${cred.skill.replace(/\s+/g, '_')}_${cred.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-white" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h2>
          <p className="text-gray-600 mb-6">Verified Skill Credentials are available for Premium members.</p>
          <button onClick={() => navigate('/app/payment')} className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-blue-600 transition">
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  if (examState && !examComplete) {
    const q = examQuestions[currentQ];
    const progress = ((currentQ + 1) / examQuestions.length) * 100;
    const isCoding = q.type === 'coding';

    return (
      <div className="fixed inset-0 z-[200] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-auto">
        {/* Camera feed - top right corner */}
        <div className="fixed top-4 right-4 z-[210] rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="w-40 h-30 object-cover" style={{ transform: 'scaleX(-1)' }} />
          <div className="absolute top-1 left-1 flex items-center gap-1 bg-red-500/80 rounded px-1.5 py-0.5">
            <Camera size={10} className="text-white" />
            <span className="text-[9px] text-white font-bold">LIVE</span>
          </div>
        </div>

        {/* Violation warning */}
        {violationMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[210] bg-red-500/90 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-2xl animate-pulse">
            <AlertTriangle size={16} /> {violationMsg}
          </div>
        )}

        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-xl">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{examState.skill} — Proctored Exam</h2>
                <p className="text-sm text-indigo-300">Question {currentQ + 1} of {examQuestions.length} {isCoding ? '(Coding)' : '(MCQ)'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-white/40">Violations</p>
                <p className={`text-sm font-bold ${violations > 0 ? 'text-red-400' : 'text-white/60'}`}>{violations}/{MAX_VIOLATIONS}</p>
              </div>
              <button onClick={closeExam} className="text-white/30 hover:text-white transition"><X size={20} /></button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-white/10 rounded-full mb-8">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Question */}
          <div className="mb-6">
            <p className="text-lg text-white font-medium leading-relaxed">{q.q}</p>
          </div>

          {isCoding ? (
            <div className="space-y-4 mb-8">
              {/* Test cases display */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <p className="text-xs text-white/50 font-semibold mb-2">Test Cases:</p>
                {q.testCases.map((tc, i) => (
                  <div key={i} className="flex items-center gap-4 text-xs text-white/70 mb-1">
                    <span className="text-white/40">Input: <code className="text-emerald-300">{tc.input || '(empty)'}</code></span>
                    <span className="text-white/40">Expected: <code className="text-amber-300">{tc.expected}</code></span>
                  </div>
                ))}
              </div>

              {/* Code editor */}
              <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                  <span className="text-xs text-white/40 font-medium">{q.language}</span>
                  <button onClick={handleRunCode} disabled={runningCode} className="px-3 py-1 rounded-lg bg-emerald-500/80 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition">
                    {runningCode ? 'Running...' : 'Run Code'}
                  </button>
                </div>
                <textarea
                  value={codeAnswer}
                  onChange={(e) => setCodeAnswer(e.target.value)}
                  className="w-full bg-transparent text-emerald-300 font-mono text-sm p-4 outline-none resize-none"
                  rows={12}
                  spellCheck={false}
                  style={{ tabSize: 2 }}
                />
              </div>

              {/* Code result */}
              {codeResult && (
                <div className={`p-3 rounded-xl text-sm font-medium ${codeResult.passed ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                  {codeResult.passed ? 'All test cases passed!' : 'Some test cases failed.'}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAnswer(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedAnswer === i
                      ? 'bg-indigo-500/30 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      selectedAnswer === i ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (currentQ > 0) {
                  setCurrentQ(currentQ - 1);
                  setSelectedAnswer(answers[currentQ - 1] ?? null);
                  setCodeResult(null);
                  if (examQuestions[currentQ - 1]?.type === 'coding') {
                    setCodeAnswer(examQuestions[currentQ - 1]?.starterCode || '');
                  }
                }
              }}
              disabled={currentQ === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={handleAnswer}
              disabled={isCoding ? !codeResult : selectedAnswer === null}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold hover:from-indigo-600 hover:to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/25"
            >
              {currentQ === examQuestions.length - 1 ? 'Submit Exam' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examState && examComplete) {
    return (
      <div className="fixed inset-0 z-[200] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 max-w-md w-full p-8 shadow-2xl text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${examResult.passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {examResult.passed ? <Trophy size={48} className="text-emerald-400" /> : <X size={48} className="text-red-400" />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{examResult.passed ? 'Congratulations!' : 'Not Quite There'}</h2>
          <p className="text-white/60 mb-2">
            {examResult.reason || (examResult.passed
              ? `You passed the ${examState.skill} exam!`
              : `You scored ${examResult.correct}/${examResult.total}. Need ${PASS_THRESHOLD} to pass.`)}
          </p>
          {examResult.reason && <p className="text-red-400 text-xs mb-4">Exam was terminated due to proctoring violations.</p>}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="bg-white/10 rounded-2xl px-6 py-4 text-center">
              <p className="text-3xl font-bold text-white">{examResult.correct}<span className="text-lg text-white/40">/{examResult.total}</span></p>
              <p className="text-xs text-white/50 mt-1">Score</p>
            </div>
          </div>
          <button onClick={closeExam} className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition">
            {examResult.passed ? 'View Credentials' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Skill Credentials</h1>
                <p className="text-sm text-gray-500">Pass proctored exams to earn verified badges</p>
              </div>
            </div>
            <button onClick={() => setShowVerifyInput(!showVerifyInput)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-sm font-medium flex items-center gap-1.5">
              <Search size={14} /> Verify
            </button>
          </div>
          {showVerifyInput && (
            <div className="mt-4 flex gap-2">
              <input type="text" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="Credential ID (e.g. SK-XXXXXXXXXX)" className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-indigo-400 focus:ring-0 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleVerifyLookup()} />
              <button onClick={handleVerifyLookup} className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition">Verify</button>
            </div>
          )}
          {showVerifyInput && verifiedResult !== null && (
            <div className={`mt-3 p-4 rounded-xl ${verifiedResult ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              {verifiedResult ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-emerald-500 mt-0.5" size={18} />
                  <div>
                    <p className="font-bold text-emerald-800">Credential Verified!</p>
                    <p className="text-sm text-emerald-700 mt-1">Skill: <strong>{verifiedResult.skill}</strong></p>
                    <p className="text-sm text-emerald-700">Holder: <strong>{verifiedResult.userName}</strong></p>
                    <p className="text-sm text-emerald-700">Score: <strong>{verifiedResult.examScore || 'N/A'}/10</strong></p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3"><Lock className="text-red-500" size={18} /><p className="font-medium text-red-700">Credential not found.</p></div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 text-center border shadow-sm">
            <div className="text-3xl font-bold text-indigo-600">{credentials.length}</div>
            <div className="text-sm text-gray-500 mt-1">Credentials Earned</div>
          </div>
          <div className="bg-white rounded-xl p-5 text-center border shadow-sm">
            <div className="text-3xl font-bold text-emerald-600">{new Set(credentials.map(c => c.category)).size}</div>
            <div className="text-sm text-gray-500 mt-1">Skill Categories</div>
          </div>
          <div className="bg-white rounded-xl p-5 text-center border shadow-sm">
            <div className="text-3xl font-bold text-amber-600">
              {credentials.length > 0 ? Math.round(credentials.reduce((s, c) => s + (c.examScore || 0), 0) / credentials.length * 10) / 10 : 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Avg. Score</div>
          </div>
        </div>

        {credentials.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Award size={18} /> Your Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {credentials.map(cred => (
                <div key={cred.id} className="bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{cred.skill}</h3>
                      <p className="text-xs text-gray-400">{cred.category}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <CheckCircle size={10} /> {cred.level}
                    </span>
                  </div>
                  {cred.examScore && <div className="mb-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1 inline-block">Score: {cred.examScore}/10</div>}
                  <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-2"><Clock size={12} /> Earned {new Date(cred.earnedAt).toLocaleDateString('en-IN')}</div>
                    <div className="flex items-center gap-2"><Shield size={12} /> {cred.verifiedBy}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyCredentialId(cred.id)} className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition flex items-center justify-center gap-1">
                      {copied === cred.id ? <><CheckCircle size={11} /> Copied!</> : <><Copy size={11} /> Copy ID</>}
                    </button>
                    <button onClick={() => downloadCredential(cred)} className="flex-1 py-1.5 rounded-lg bg-indigo-100 text-indigo-600 text-xs font-medium hover:bg-indigo-200 transition flex items-center justify-center gap-1">
                      <Download size={11} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"><Sparkles size={18} /> Available Skills — Proctored Exam Required</h2>
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-2"><Eye size={14} /> Exams are fullscreen with camera, tab-switch detection, and key blocking. Max 3 violations allowed.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SKILL_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-r ${cat.color} px-5 py-3 flex items-center gap-2`}>
                  <Icon className="text-white" size={18} />
                  <span className="text-white font-bold text-sm">{cat.label}</span>
                </div>
                <div className="p-4 space-y-2">
                  {cat.skills.map(skill => {
                    const hasCredential = credentials.some(c => c.skill === skill);
                    const hasQuestions = SKILL_EXAM_QUESTIONS[cat.label]?.[skill]?.length > 0;
                    return (
                      <div key={skill} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition">
                        <div className="flex items-center gap-2">
                          {hasCredential ? <CheckCircle size={16} className="text-emerald-500" /> : <Star size={16} className="text-gray-300" />}
                          <span className={`text-sm font-medium ${hasCredential ? 'text-emerald-700' : 'text-gray-700'}`}>{skill}</span>
                        </div>
                        {hasCredential ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">EARNED</span>
                        ) : hasQuestions ? (
                          <button onClick={() => startExam(skill, cat.label)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition flex items-center gap-1">
                            <Eye size={9} /> TAKE EXAM
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">SOON</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VerifiedSkillCredentials;
