import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Map, Sparkles, ArrowRight, Loader2, Download, RotateCcw, ChevronDown, BookOpen, Code, Palette, Database, Shield, Cloud, Brain, Briefcase, Clock, Target, CheckCircle, Lock } from 'lucide-react';

const CAREER_GOALS = [
  { id: 'frontend', label: 'Frontend Developer', icon: Code, color: 'from-blue-500 to-cyan-500' },
  { id: 'backend', label: 'Backend Developer', icon: Database, color: 'from-emerald-500 to-teal-500' },
  { id: 'fullstack', label: 'Full Stack Developer', icon: Code, color: 'from-purple-500 to-pink-500' },
  { id: 'data_science', label: 'Data Scientist', icon: Brain, color: 'from-amber-500 to-orange-500' },
  { id: 'ml_engineer', label: 'ML Engineer', icon: Brain, color: 'from-rose-500 to-red-500' },
  { id: 'devops', label: 'DevOps Engineer', icon: Cloud, color: 'from-sky-500 to-blue-500' },
  { id: 'cybersecurity', label: 'Cybersecurity Analyst', icon: Shield, color: 'from-green-500 to-emerald-500' },
  { id: 'ui_ux', label: 'UI/UX Designer', icon: Palette, color: 'from-pink-500 to-fuchsia-500' },
  { id: 'mobile', label: 'Mobile Developer', icon: Code, color: 'from-indigo-500 to-violet-500' },
  { id: 'cloud', label: 'Cloud Architect', icon: Cloud, color: 'from-cyan-500 to-blue-500' },
];

const EXPERIENCE_LEVELS = [
  { id: 'student', label: 'Student / College', desc: 'Currently studying' },
  { id: 'fresher', label: 'Fresher / 0-1 yrs', desc: 'Just graduated or near graduation' },
  { id: 'junior', label: 'Junior / 1-3 yrs', desc: 'Some industry experience' },
  { id: 'mid', label: 'Mid-level / 3-5 yrs', desc: 'Solid experience' },
];

const ROADMAP_SYSTEM_PROMPT = `You are a career roadmap generator for students and professionals. Generate a structured, actionable career roadmap based on the user's goal, experience level, and any additional details.

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no code fences, no explanation text.
2. The JSON must match this exact structure:
{
  "title": "Career roadmap title",
  "summary": "2-3 sentence overview of the roadmap",
  "timeline": "estimated timeline (e.g. '6-12 months')",
  "phases": [
    {
      "name": "Phase name",
      "duration": "e.g. 'Months 1-2'",
      "goals": ["goal1", "goal2"],
      "resources": [
        { "name": "Resource name", "type": "course|book|project|practice|certification", "link": "suggestion or empty string" }
      ],
      "milestone": "What you should be able to do after this phase"
    }
  ],
  "keySkills": ["skill1", "skill2", "skill3"],
  "tips": ["tip1", "tip2", "tip3"]
}

3. Include 4-6 phases depending on complexity.
4. Be specific with real resource names (courses, books, tools).
5. Include practical projects and portfolio building.
6. Keep it actionable and student-friendly.`;

const generateRoadmapLocally = (goal, level) => {
  const localRoadmaps = {
    frontend: {
      title: 'Frontend Developer Roadmap',
      summary: 'Master HTML, CSS, JavaScript and modern frameworks to build beautiful, responsive web applications.',
      timeline: '4-6 months',
      phases: [
        { name: 'Foundation', duration: 'Weeks 1-4', goals: ['Master HTML5 semantic elements', 'CSS3 Flexbox & Grid', 'Responsive design with media queries'], resources: [{ name: 'freeCodeCamp Responsive Web Design', type: 'course', link: '' }, { name: 'MDN Web Docs', type: 'practice', link: '' }], milestone: 'Build 3 static responsive websites' },
        { name: 'JavaScript Mastery', duration: 'Weeks 5-12', goals: ['ES6+ features', 'DOM manipulation', 'Async/Await & Promises', 'Fetch API'], resources: [{ name: 'JavaScript.info', type: 'course', link: '' }, { name: 'Eloquent JavaScript (book)', type: 'book', link: '' }], milestone: 'Build interactive web apps without frameworks' },
        { name: 'React.js Deep Dive', duration: 'Weeks 13-20', goals: ['Components & JSX', 'State & Props', 'Hooks (useState, useEffect, useContext)', 'React Router'], resources: [{ name: 'React Official Tutorial', type: 'course', link: '' }, { name: 'Scrimba React Course', type: 'course', link: '' }], milestone: 'Build a full React SPA with routing and state management' },
        { name: 'Advanced Tools', duration: 'Weeks 21-24', goals: ['TypeScript basics', 'Tailwind CSS / Styled Components', 'Testing with Jest', 'Git & deployment'], resources: [{ name: 'TypeScript Handbook', type: 'course', link: '' }, { name: 'Vercel/Netlify deployment', type: 'practice', link: '' }], milestone: 'Deploy production-ready apps with CI/CD' },
        { name: 'Portfolio & Job Prep', duration: 'Weeks 25-26', goals: ['Build portfolio website', '3-5 strong projects', 'Resume optimization', 'Interview prep'], resources: [{ name: 'Frontend Interview Handbook', type: 'book', link: '' }], milestone: 'Ready to apply for frontend roles' },
      ],
      keySkills: ['HTML5/CSS3', 'JavaScript (ES6+)', 'React.js', 'TypeScript', 'Git', 'Responsive Design'],
      tips: ['Build real projects, not just tutorials', 'Contribute to open source', 'Learn accessibility (a11y)', 'Practice coding challenges on LeetCode'],
    },
    backend: {
      title: 'Backend Developer Roadmap',
      summary: 'Learn server-side programming, APIs, databases, and system design to build scalable backend systems.',
      timeline: '5-7 months',
      phases: [
        { name: 'Programming Foundation', duration: 'Weeks 1-4', goals: ['Choose a language (Python/Java/Node.js)', 'OOP concepts', 'Basic data structures'], resources: [{ name: 'Python Crash Course', type: 'book', link: '' }, { name: 'HackerRank', type: 'practice', link: '' }], milestone: 'Solve 50+ coding problems' },
        { name: 'Databases', duration: 'Weeks 5-10', goals: ['SQL fundamentals', 'PostgreSQL/MySQL', 'MongoDB basics', 'Database design & normalization'], resources: [{ name: 'SQLBolt', type: 'practice', link: '' }, { name: 'Database Design course', type: 'course', link: '' }], milestone: 'Design and query complex database schemas' },
        { name: 'API Development', duration: 'Weeks 11-18', goals: ['REST API design', 'Express.js / FastAPI / Spring Boot', 'Authentication (JWT, OAuth)', 'Middleware & validation'], resources: [{ name: 'RESTful API Design', type: 'course', link: '' }, { name: 'Postman Learning Center', type: 'practice', link: '' }], milestone: 'Build complete CRUD APIs with auth' },
        { name: 'System Design & DevOps', duration: 'Weeks 19-24', goals: ['Caching (Redis)', 'Message queues', 'Docker basics', 'CI/CD pipelines'], resources: [{ name: 'Docker Getting Started', type: 'course', link: '' }, { name: 'System Design Interview (book)', type: 'book', link: '' }], milestone: 'Design scalable systems and deploy with Docker' },
        { name: 'Portfolio Projects', duration: 'Weeks 25-28', goals: ['Build REST API portfolio project', 'Real-time app with WebSockets', 'Open source contribution', 'Resume & interview prep'], resources: [{ name: 'Build a SaaS tutorial', type: 'project', link: '' }], milestone: 'Ready for backend developer roles' },
      ],
      keySkills: ['Python/Java/Node.js', 'SQL & NoSQL databases', 'REST APIs', 'Docker', 'Git', 'System Design'],
      tips: ['Learn SQL deeply — it never goes out of style', 'Build APIs that other developers would want to use', 'Understand HTTP status codes and methods', 'Practice system design interviews early'],
    },
    fullstack: {
      title: 'Full Stack Developer Roadmap',
      summary: 'Master both frontend and backend development to build complete web applications from scratch.',
      timeline: '6-9 months',
      phases: [
        { name: 'Web Fundamentals', duration: 'Weeks 1-4', goals: ['HTML5, CSS3, JavaScript basics', 'Git & GitHub', 'Command line basics'], resources: [{ name: 'The Odin Project', type: 'course', link: '' }], milestone: 'Build and deploy static websites' },
        { name: 'Frontend Development', duration: 'Weeks 5-12', goals: ['React.js or Vue.js', 'State management', 'Responsive design', 'CSS frameworks'], resources: [{ name: 'React Documentation', type: 'course', link: '' }], milestone: 'Build 3+ React projects' },
        { name: 'Backend Development', duration: 'Weeks 13-20', goals: ['Node.js & Express or Python & Django', 'REST APIs', 'Database design', 'Authentication'], resources: [{ name: 'Node.js Getting Started', type: 'course', link: '' }, { name: 'PostgreSQL Tutorial', type: 'practice', link: '' }], milestone: 'Build full CRUD APIs with auth and database' },
        { name: 'Full Stack Integration', duration: 'Weeks 21-26', goals: ['Connect frontend to backend', 'Deployment (Vercel + Railway/Render)', 'Testing', 'Performance optimization'], resources: [{ name: 'Full Stack Open', type: 'course', link: '' }], milestone: 'Deploy a complete full stack application' },
        { name: 'Capstone & Job Prep', duration: 'Weeks 27-30', goals: ['Build capstone project', 'Portfolio website', 'Technical interview prep', 'Resume building'], resources: [{ name: 'LeetCode Easy/Medium', type: 'practice', link: '' }], milestone: 'Ready for full stack developer roles' },
      ],
      keySkills: ['HTML/CSS/JavaScript', 'React.js', 'Node.js', 'PostgreSQL', 'Git', 'REST APIs', 'Deployment'],
      tips: ['Start with frontend, then add backend gradually', 'Build full-stack projects that demonstrate both skills', 'Learn deployment early — it boosts confidence', 'Practice technical interviews weekly'],
    },
    data_science: {
      title: 'Data Scientist Roadmap',
      summary: 'Learn statistics, Python, ML algorithms, and data visualization to extract insights from data.',
      timeline: '6-9 months',
      phases: [
        { name: 'Math & Stats Foundation', duration: 'Weeks 1-4', goals: ['Linear algebra basics', 'Probability & statistics', 'Descriptive vs inferential stats'], resources: [{ name: 'Khan Academy Statistics', type: 'course', link: '' }], milestone: 'Comfortable with statistical concepts' },
        { name: 'Python for Data Science', duration: 'Weeks 5-10', goals: ['Python basics', 'NumPy, Pandas, Matplotlib', 'Data cleaning & transformation'], resources: [{ name: 'Python for Data Analysis (book)', type: 'book', link: '' }, { name: 'Kaggle Python course', type: 'course', link: '' }], milestone: 'Clean and analyze real datasets' },
        { name: 'Machine Learning', duration: 'Weeks 11-18', goals: ['Supervised learning (regression, classification)', 'Unsupervised learning (clustering, PCA)', 'Model evaluation & validation', 'Scikit-learn'], resources: [{ name: 'Andrew Ng ML Course', type: 'course', link: '' }, { name: 'Hands-On ML with Scikit-Learn', type: 'book', link: '' }], milestone: 'Build and evaluate ML models' },
        { name: 'Advanced Topics', duration: 'Weeks 19-24', goals: ['Deep Learning basics (TensorFlow/PyTorch)', 'NLP fundamentals', 'Time series analysis', 'Feature engineering'], resources: [{ name: 'Deep Learning Specialization', type: 'course', link: '' }], milestone: 'Build deep learning models for real problems' },
        { name: 'Portfolio & Job Prep', duration: 'Weeks 25-28', goals: ['Kaggle competitions', '3 portfolio projects', 'Blog about your work', 'Interview prep'], resources: [{ name: 'Kaggle Competitions', type: 'practice', link: '' }], milestone: 'Ready for data scientist roles' },
      ],
      keySkills: ['Python', 'Statistics', 'Machine Learning', 'SQL', 'Data Visualization', 'TensorFlow/PyTorch'],
      tips: ['Participate in Kaggle competitions', 'Write about your projects — it builds credibility', 'Focus on understanding algorithms, not just using them', 'Practice explaining complex concepts simply'],
    },
  };

  // Default fallback roadmap
  const defaultRoadmap = {
    title: `${CAREER_GOALS.find(g => g.id === goal)?.label || 'Software Developer'} Roadmap`,
    summary: `A structured plan to become a ${CAREER_GOALS.find(g => g.id === goal)?.label || 'software developer'}, tailored for ${EXPERIENCE_LEVELS.find(l => l.id === level)?.label || 'your level'}.`,
    timeline: '4-8 months',
    phases: [
      { name: 'Foundation', duration: 'Weeks 1-4', goals: ['Learn core programming concepts', 'Practice daily coding', 'Set up development environment'], resources: [{ name: 'freeCodeCamp', type: 'course', link: '' }], milestone: 'Comfortable with basics' },
      { name: 'Core Skills', duration: 'Weeks 5-12', goals: ['Deep dive into primary technologies', 'Build small projects', 'Learn Git'], resources: [{ name: 'MDN Web Docs', type: 'course', link: '' }], milestone: 'Build projects independently' },
      { name: 'Advanced Topics', duration: 'Weeks 13-20', goals: ['Learn framework/library', 'Database knowledge', 'API development'], resources: [{ name: 'Official Documentation', type: 'course', link: '' }], milestone: 'Build full applications' },
      { name: 'Portfolio & Job Prep', duration: 'Weeks 21-24', goals: ['Build portfolio', 'Practice interviews', 'Resume optimization'], resources: [{ name: 'LeetCode', type: 'practice', link: '' }], milestone: 'Ready to apply for jobs' },
    ],
    keySkills: ['Problem Solving', 'Programming Language', 'Framework', 'Database', 'Git', 'Communication'],
    tips: ['Practice coding daily', 'Build real projects', 'Join developer communities', 'Never stop learning'],
  };

  return localRoadmaps[goal] || defaultRoadmap;
};

const CareerRoadmapGenerator = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();
  const [step, setStep] = useState('form'); // form | loading | result
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(0);

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-white" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h2>
          <p className="text-gray-600 mb-6">AI Career Roadmap Generator is available for Premium members.</p>
          <button onClick={() => navigate('/app/payment')} className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-blue-600 transition">
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!selectedGoal || !selectedLevel) return;
    setStep('loading');

    const goalData = CAREER_GOALS.find(g => g.id === selectedGoal);
    const levelData = EXPERIENCE_LEVELS.find(l => l.id === selectedLevel);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          messages: [
            { role: 'system', content: ROADMAP_SYSTEM_PROMPT },
            { role: 'user', content: `Generate a career roadmap for:\n- Goal: ${goalData?.label}\n- Experience Level: ${levelData?.label} (${levelData?.desc})${additionalInfo ? `\n- Additional Info: ${additionalInfo}` : ''}` },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          try {
            const parsed = JSON.parse(data.reply);
            if (parsed.phases && parsed.phases.length > 0) {
              setRoadmap(parsed);
              setStep('result');
              return;
            }
          } catch {}
        }
      }
    } catch {}

    // Fallback to local roadmap
    setRoadmap(generateRoadmapLocally(selectedGoal, selectedLevel));
    setStep('result');
  };

  const handleReset = () => {
    setStep('form');
    setSelectedGoal(null);
    setSelectedLevel(null);
    setAdditionalInfo('');
    setRoadmap(null);
    setExpandedPhase(0);
  };

  const downloadRoadmap = () => {
    if (!roadmap) return;
    let text = `${roadmap.title}\n${'='.repeat(roadmap.title.length)}\n\n${roadmap.summary}\nTimeline: ${roadmap.timeline}\n\n`;
    roadmap.phases.forEach((phase, i) => {
      text += `\n--- Phase ${i + 1}: ${phase.name} (${phase.duration}) ---\n`;
      text += `Milestone: ${phase.milestone}\n`;
      text += `Goals:\n${phase.goals.map(g => `  • ${g}`).join('\n')}\n`;
      if (phase.resources?.length) {
        text += `Resources:\n${phase.resources.map(r => `  📚 ${r.name} (${r.type})`).join('\n')}\n`;
      }
    });
    text += `\n\nKey Skills: ${roadmap.keySkills?.join(', ')}\n`;
    text += `\nTips:\n${roadmap.tips?.map(t => `  💡 ${t}`).join('\n')}\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roadmap.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- LOADING VIEW ----
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="text-white" size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Generating Your Roadmap...</h2>
          <p className="text-gray-500 text-sm">AI is crafting a personalized career plan for you</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // ---- RESULT VIEW ----
  if (step === 'result' && roadmap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-lg">
                <Map className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{roadmap.title}</h1>
                <p className="text-xs text-gray-500">Timeline: {roadmap.timeline}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadRoadmap} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-sm font-medium flex items-center gap-1.5">
                <Download size={14} /> Download
              </button>
              <button onClick={handleReset} className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition text-sm font-medium flex items-center gap-1.5">
                <RotateCcw size={14} /> New Roadmap
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Summary */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
            <p className="text-gray-700 leading-relaxed">{roadmap.summary}</p>
            {roadmap.keySkills?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {roadmap.keySkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{skill}</span>
                ))}
              </div>
            )}
          </div>

          {/* Phases */}
          <div className="space-y-4 mb-6">
            {roadmap.phases.map((phase, i) => (
              <div key={i} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${expandedPhase === i ? 'ring-2 ring-indigo-300' : ''}`}>
                <button onClick={() => setExpandedPhase(expandedPhase === i ? -1 : i)} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${
                      ['from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-purple-500 to-pink-500', 'from-rose-500 to-red-500'][i % 5]
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{phase.name}</h3>
                      <p className="text-xs text-gray-500">{phase.duration}</p>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${expandedPhase === i ? 'rotate-180' : ''}`} />
                </button>
                {expandedPhase === i && (
                  <div className="px-6 pb-5 border-t">
                    <div className="mt-4 mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                        <Target size={14} /> {phase.milestone}
                      </div>
                    </div>
                    <div className="mb-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Goals</h4>
                      <ul className="space-y-1.5">
                        {phase.goals.map((g, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {phase.resources?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Resources</h4>
                        <div className="flex flex-wrap gap-2">
                          {phase.resources.map((r, j) => (
                            <span key={j} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                              {r.type === 'course' ? '🎓' : r.type === 'book' ? '📖' : r.type === 'practice' ? '⚡' : r.type === 'project' ? '🛠️' : '🏆'} {r.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tips */}
          {roadmap.tips?.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <Sparkles size={16} /> Pro Tips
              </h3>
              <ul className="space-y-2">
                {roadmap.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="text-amber-500 mt-0.5">💡</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- FORM VIEW ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl">
              <Map className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Career Roadmap Generator</h1>
              <p className="text-sm text-gray-500">Get a personalized career plan powered by AI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Career Goal */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">1. What's your career goal?</h2>
          <p className="text-sm text-gray-500 mb-4">Select the role you want to pursue</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {CAREER_GOALS.map(goal => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${isSelected ? 'border-indigo-400 bg-indigo-50 shadow-md scale-105' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="text-white" size={18} />
                  </div>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>{goal.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Experience Level */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">2. Your experience level?</h2>
          <p className="text-sm text-gray-500 mb-4">This helps tailor the roadmap difficulty</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXPERIENCE_LEVELS.map(level => {
              const isSelected = selectedLevel === level.id;
              return (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-indigo-400 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                >
                  <span className={`text-sm font-bold block ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{level.label}</span>
                  <span className="text-xs text-gray-500 mt-0.5 block">{level.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Additional Info */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">3. Any additional details? (optional)</h2>
          <p className="text-sm text-gray-500 mb-4">Tell us about your interests, constraints, or specific technologies you want to learn</p>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="e.g. I know basic HTML/CSS, prefer learning from videos, want to focus on React ecosystem..."
            className="w-full p-4 rounded-xl border-2 border-gray-200 text-sm text-gray-700 focus:border-indigo-400 focus:ring-0 outline-none resize-none bg-white"
            rows={3}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedGoal || !selectedLevel}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold text-lg hover:from-indigo-600 hover:to-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Sparkles size={20} /> Generate My Roadmap <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default CareerRoadmapGenerator;
