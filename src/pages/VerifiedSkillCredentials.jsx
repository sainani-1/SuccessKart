import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Award, CheckCircle, ExternalLink, Download, Share2, Search, Lock, Sparkles, Code, Brain, Palette, Database, Cloud, BookOpen, Star, Clock, Copy } from 'lucide-react';

const SKILL_CATEGORIES = [
  { id: 'programming', label: 'Programming', icon: Code, color: 'from-blue-500 to-indigo-500', skills: ['Python', 'JavaScript', 'Java', 'C++', 'TypeScript'] },
  { id: 'web_dev', label: 'Web Development', icon: Globe, color: 'from-emerald-500 to-teal-500', skills: ['HTML/CSS', 'React.js', 'Node.js', 'Vue.js', 'Angular'] },
  { id: 'data', label: 'Data & AI', icon: Brain, color: 'from-amber-500 to-orange-500', skills: ['Machine Learning', 'Data Analysis', 'SQL', 'TensorFlow', 'Pandas'] },
  { id: 'cloud', label: 'Cloud & DevOps', icon: Cloud, color: 'from-sky-500 to-blue-500', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'] },
  { id: 'design', label: 'Design', icon: Palette, color: 'from-pink-500 to-fuchsia-500', skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop'] },
  { id: 'soft_skills', label: 'Soft Skills', icon: BookOpen, color: 'from-purple-500 to-violet-500', skills: ['Communication', 'Leadership', 'Problem Solving', 'Teamwork'] },
];

function Globe(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  );
}

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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(null);
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verifyId, setVerifyId] = useState('');
  const [verifiedResult, setVerifiedResult] = useState(null);

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

  const earnCredential = (skillName, category) => {
    const existing = credentials.find(c => c.skill === skillName);
    if (existing) return;

    const newCred = {
      id: generateCredentialId(profile.id, skillName),
      skill: skillName,
      category,
      earnedAt: new Date().toISOString(),
      level: 'Verified',
      verifiedBy: 'SucessKart Platform',
      userId: profile.id,
      userName: profile.full_name || profile.username || 'Student',
      verificationUrl: `${window.location.origin}/verify-credential/${generateCredentialId(profile.id, skillName)}`,
    };

    saveCredentials([...credentials, newCred]);
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
        try {
          const creds = JSON.parse(localStorage.getItem(key));
          allStored.push(...creds);
        } catch {}
      }
    }
    const found = allStored.find(c => c.id === verifyId.trim());
    setVerifiedResult(found || null);
  };

  const downloadCredential = (cred) => {
    const text = `
VERIFIED SKILL CREDENTIAL
=========================
SucessKart EdTech Platform

Credential ID: ${cred.id}
Skill: ${cred.skill}
Category: ${cred.category}
Level: ${cred.level}
Holder: ${cred.userName}
Issued: ${new Date(cred.earnedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
Verified By: ${cred.verifiedBy}

Verify at: ${cred.verificationUrl}
=========================
This credential is digitally verified by SucessKart Platform.
    `.trim();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Skill Credentials</h1>
                <p className="text-sm text-gray-500">Earn verified badges for your skills</p>
              </div>
            </div>
            <button onClick={() => setShowVerifyInput(!showVerifyInput)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-sm font-medium flex items-center gap-1.5">
              <Search size={14} /> Verify Credential
            </button>
          </div>

          {/* Verify Input */}
          {showVerifyInput && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                placeholder="Enter Credential ID (e.g. SK-XXXXXXXXXX)"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-indigo-400 focus:ring-0 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyLookup()}
              />
              <button onClick={handleVerifyLookup} className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition">
                Verify
              </button>
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
                    <p className="text-sm text-emerald-700">Issued: {new Date(verifiedResult.earnedAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Lock className="text-red-500" size={18} />
                  <p className="font-medium text-red-700">Credential not found. Please check the ID and try again.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
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
            <div className="text-3xl font-bold text-amber-600">{credentials.length > 0 ? 'Verified' : 'None'}</div>
            <div className="text-sm text-gray-500 mt-1">Status</div>
          </div>
        </div>

        {/* Earned Credentials */}
        {credentials.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award size={18} /> Your Credentials
            </h2>
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
                  <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={12} /> Earned {new Date(cred.earnedAt).toLocaleDateString('en-IN')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={12} /> {cred.verifiedBy}
                    </div>
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

        {/* Skill Categories */}
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles size={18} /> Available Skills to Earn
        </h2>
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
                    return (
                      <div key={skill} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition">
                        <div className="flex items-center gap-2">
                          {hasCredential ? (
                            <CheckCircle size={16} className="text-emerald-500" />
                          ) : (
                            <Star size={16} className="text-gray-300" />
                          )}
                          <span className={`text-sm font-medium ${hasCredential ? 'text-emerald-700' : 'text-gray-700'}`}>{skill}</span>
                        </div>
                        {hasCredential ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">EARNED</span>
                        ) : (
                          <button
                            onClick={() => earnCredential(skill, cat.label)}
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition"
                          >
                            EARN NOW
                          </button>
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
