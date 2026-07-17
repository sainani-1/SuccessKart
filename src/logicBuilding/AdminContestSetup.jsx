import React, { useEffect, useState, useCallback } from 'react';
import { setContestQuestions, weeklyContest } from './contestModel';
import LoadingSpinner from '../components/LoadingSpinner';
import { logError } from '../utils/errorLogger';
import { generateAllQuestions, DIFFICULTY_CONFIG } from './generateQuestions';

const DIFFICULTY_OPTIONS = ['basic', 'intermediate', 'advanced', 'expert'];

function DifficultyBadge({ difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.basic;
  return (
    <span style={{
      display: 'inline-block',
      background: cfg.color,
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '0.75rem',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {cfg.label}
    </span>
  );
}

function TestCaseBadge({ hidden }) {
  return (
    <span style={{
      display: 'inline-block',
      background: hidden ? '#fca5a5' : '#a5b4fc',
      color: hidden ? '#7f1d1d' : '#312e81',
      fontWeight: 'bold',
      fontSize: '0.7rem',
      padding: '0.15rem 0.5rem',
      borderRadius: '999px',
      marginLeft: '0.4rem',
    }}>
      {hidden ? 'Hidden' : 'Shown'}
    </span>
  );
}

function QuestionCard({ question, index, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.basic;
  const shownCount = (question.testCases || []).filter(tc => !tc.hidden).length;
  const hiddenCount = (question.testCases || []).filter(tc => tc.hidden).length;

  return (
    <div style={{
      background: '#fff',
      borderRadius: '1rem',
      boxShadow: expanded ? '0 4px 16px rgba(99,102,241,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
      border: `2px solid ${cfg.color}30`,
      marginBottom: '1rem',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.2rem',
          cursor: 'pointer',
          gap: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flex: 1, minWidth: 0 }}>
          <span style={{
            background: '#e0e7ff',
            color: '#6366f1',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '0.3rem',
            flexShrink: 0,
          }}>
            #{index + 1}
          </span>
          <DifficultyBadge difficulty={question.difficulty} />
          <span style={{
            fontSize: '1.05rem',
            fontWeight: 'bold',
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {question.title || `Question ${index + 1}`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {shownCount} shown / {hiddenCount} hidden
          </span>
          <span style={{ fontSize: '1.2rem', color: '#6366f1', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            &#9660;
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${cfg.color}20`, padding: '1.2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
              Problem Description
            </h4>
            <div style={{
              background: '#f8fafc',
              borderRadius: '0.5rem',
              padding: '1rem',
              fontSize: '0.95rem',
              color: '#334155',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {question.description}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
              Test Cases ({(question.testCases || []).length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(question.testCases || []).map((tc, tcIdx) => (
                <div key={tcIdx} style={{
                  background: tc.hidden ? '#fef2f2' : '#f0f4ff',
                  border: `1px solid ${tc.hidden ? '#fca5a5' : '#c7d2fe'}`,
                  borderRadius: '0.5rem',
                  padding: '0.7rem 1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#334155' }}>
                      Test Case {tcIdx + 1}
                    </span>
                    <TestCaseBadge hidden={tc.hidden} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                    <div><strong>Input:</strong> <code style={{ background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>{tc.input}</code></div>
                    <div><strong>Expected Output:</strong> <code style={{ background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>{tc.output}</code></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(index); }}
              style={{
                background: '#6366f1',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '0.4rem',
                padding: '0.4rem 1rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(index); }}
              style={{
                background: '#ef4444',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '0.4rem',
                padding: '0.4rem 1rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({ question, onSave, onClose }) {
  const [form, setForm] = useState({
    title: question.title || '',
    description: question.description || '',
    difficulty: question.difficulty || 'basic',
    testCases: [...(question.testCases || [])],
  });
  const [tcInput, setTcInput] = useState('');
  const [tcOutput, setTcOutput] = useState('');
  const [tcHidden, setTcHidden] = useState(false);

  function addTestCase() {
    setForm({
      ...form,
      testCases: [...form.testCases, { input: tcInput, output: tcOutput, hidden: tcHidden }],
    });
    setTcInput('');
    setTcOutput('');
    setTcHidden(false);
  }

  function removeTestCase(idx) {
    setForm({ ...form, testCases: form.testCases.filter((_, i) => i !== idx) });
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '1.5rem', padding: '2rem', maxWidth: '650px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#6366f1', fontWeight: 'bold' }}>Edit Question</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        <input
          placeholder="Title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem' }}
        />

        <select
          value={form.difficulty}
          onChange={e => setForm({ ...form, difficulty: e.target.value })}
          style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem' }}
        >
          {DIFFICULTY_OPTIONS.map(d => (
            <option key={d} value={d}>{DIFFICULTY_CONFIG[d].label}</option>
          ))}
        </select>

        <textarea
          placeholder="Problem Description (CodeChef format with input/output format, constraints, examples)"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '150px' }}
        />

        <div style={{ background: '#f3f4f6', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '1rem', color: '#334155', marginBottom: '0.5rem' }}>Add Test Case</h4>
          <input placeholder="Input" value={tcInput} onChange={e => setTcInput(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1' }} />
          <input placeholder="Expected Output" value={tcOutput} onChange={e => setTcOutput(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1' }} />
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={tcHidden} onChange={e => setTcHidden(e.target.checked)} style={{ marginRight: '0.5rem' }} />
            Hidden Test Case
          </label>
          <button onClick={addTestCase} style={{ background: '#6366f1', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '0.3rem', padding: '0.4rem 1rem', fontSize: '0.9rem', cursor: 'pointer' }}>Add Test Case</button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          {form.testCases.map((tc, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: tc.hidden ? '#fef2f2' : '#f0f4ff',
              border: `1px solid ${tc.hidden ? '#fca5a5' : '#c7d2fe'}`,
              borderRadius: '0.4rem', padding: '0.5rem 0.7rem', marginBottom: '0.4rem', fontSize: '0.85rem',
            }}>
              <span>
                <TestCaseBadge hidden={tc.hidden} />
                <span style={{ marginLeft: '0.5rem' }}>In: <code>{tc.input}</code> | Out: <code>{tc.output}</code></span>
              </span>
              <button onClick={() => removeTestCase(idx)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.2rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ background: '#10b981', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminContestSetup() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, difficulty: '', usedFallback: false });
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [newQuestion, setNewQuestion] = useState({
    title: '',
    description: '',
    testCases: [],
    difficulty: 'basic',
    language: 'python',
  });
  const [testCaseInput, setTestCaseInput] = useState('');
  const [testCaseOutput, setTestCaseOutput] = useState('');
  const [testCaseHidden, setTestCaseHidden] = useState(false);

  const [day, setDay] = useState(weeklyContest.day);
  const [startTime, setStartTime] = useState(weeklyContest.startTime);
  const [endTime, setEndTime] = useState(weeklyContest.endTime);

  useEffect(() => {
    let mounted = true;
    const loadContestConfig = async () => {
      try {
        await weeklyContest.load();
        if (!mounted) return;
        setDay(weeklyContest.day);
        setStartTime(weeklyContest.startTime);
        setEndTime(weeklyContest.endTime);
        setQuestions(weeklyContest.questions || []);
      } catch (e) {
        if (!mounted) return;
        setError((e && e.message) ? e.message : 'Failed to load contest config');
      } finally {
        if (mounted) setInitialLoading(false);
      }
    };
    loadContestConfig();
    return () => { mounted = false; };
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateAllQuestions((progress) => {
        setGenProgress(progress);
      });
      setQuestions(prev => [...prev, ...generated]);
    } catch (e) {
      setError((e && e.message) ? e.message : 'Failed to generate questions');
      logError({ message: 'AI question generation failed', source: 'AdminContestSetup', details: e });
    } finally {
      setGenerating(false);
      setGenProgress({ current: 0, total: 0, difficulty: '', usedFallback: false });
    }
  }, []);

  function handleAddQuestion() {
    setQuestions([...questions, newQuestion]);
    setNewQuestion({ title: '', description: '', testCases: [], difficulty: 'basic', language: 'python' });
    setTestCaseInput('');
    setTestCaseOutput('');
    setTestCaseHidden(false);
    setShowManualForm(false);
  }

  function handleAddTestCase() {
    setNewQuestion({
      ...newQuestion,
      testCases: [...newQuestion.testCases, { input: testCaseInput, output: testCaseOutput, hidden: testCaseHidden }],
    });
    setTestCaseInput('');
    setTestCaseOutput('');
    setTestCaseHidden(false);
  }

  function handleSave() {
    setLoading(true);
    setError(null);
    setContestQuestions(questions);
    weeklyContest.setSchedule(day, startTime, endTime);
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      setLoading(false);
      setError('Save timed out. Check your network or Firestore rules.');
      logError({ message: 'Firestore save timed out.', source: 'AdminContestSetup', details: null });
    }, 10000);
    weeklyContest.save()
      .then(() => {
        if (didTimeout) return;
        clearTimeout(timeout);
        setLoading(false);
        alert('Questions and schedule saved for weekly contest!');
        weeklyContest.load();
        window.dispatchEvent(new Event('weeklyContestUpdated'));
      })
      .catch(e => {
        if (didTimeout) return;
        clearTimeout(timeout);
        setLoading(false);
        setError((e && e.message) ? e.message : 'Failed to save contest');
        logError({ message: 'Firestore save error', source: 'AdminContestSetup', details: e });
      });
  }

  function handleDeleteQuestion(index) {
    if (!confirm('Delete this question?')) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }

  function handleEditQuestion(index) {
    setEditingIndex(index);
  }

  function handleSaveEdit(updatedForm) {
    setQuestions(prev => prev.map((q, i) => i === editingIndex ? { ...q, ...updatedForm } : q));
    setEditingIndex(null);
  }

  function handleClearAll() {
    if (!confirm('Clear all questions? This cannot be undone.')) return;
    setQuestions([]);
  }

  if (initialLoading) {
    return (
      <div style={{ maxWidth: '860px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%)',
          border: '1px solid #c7d2fe',
          borderRadius: '1.25rem',
          padding: '2rem',
          boxShadow: '0 8px 24px rgba(99,102,241,0.12)'
        }}>
          <LoadingSpinner fullPage={false} message="Loading contest setup..." />
        </div>
      </div>
    );
  }

  const basicCount = questions.filter(q => q.difficulty === 'basic').length;
  const intermediateCount = questions.filter(q => q.difficulty === 'intermediate').length;
  const advancedCount = questions.filter(q => q.difficulty === 'advanced').length;
  const expertCount = questions.filter(q => q.difficulty === 'expert').length;

  return (
    <div style={{
      maxWidth: '860px',
      margin: '2rem auto',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
      borderRadius: '2rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      padding: '2.5rem',
    }}>
      <h2 style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '0.5rem', textAlign: 'center' }}>
        Logic Building Contest Setup
      </h2>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '1rem', marginBottom: '2rem' }}>
        Add questions manually or generate AI-powered problems automatically
      </p>

      {/* Schedule */}
      <div style={{
        marginBottom: '2rem',
        background: '#fff',
        borderRadius: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '1.5rem',
      }}>
        <h3 style={{ fontSize: '1.2rem', color: '#6366f1', fontWeight: 'bold', marginBottom: '1rem' }}>Contest Schedule</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Day</label>
            <select value={day} onChange={e => setDay(e.target.value)} style={{ fontSize: '1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ fontSize: '1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', marginBottom: '0.3rem' }}>End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ fontSize: '1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
          </div>
        </div>
      </div>

      {/* Generate Automatically Section */}
      <div style={{
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)',
        borderRadius: '1rem',
        border: '2px dashed #8b5cf6',
        padding: '1.5rem',
      }}>
        <h3 style={{ fontSize: '1.2rem', color: '#7c3aed', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Auto-Generate Questions
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Generates 8 questions: 2 Basic, 2 Intermediate, 2 Advanced, 2 Expert — all in CodeChef problem format with test cases.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: generating ? '#a78bfa' : '#7c3aed',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '0.7rem',
            padding: '0.8rem 2rem',
            fontSize: '1.1rem',
            cursor: generating ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(124,58,237,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {generating ? (
            <>
              <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Generating... ({genProgress.current}/{genProgress.total})
            </>
          ) : (
            <>
              &#9889; Generate Questions Automatically
            </>
          )}
        </button>
        {generating && genProgress.total > 0 && (
          <div style={{ marginTop: '0.8rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 'bold', marginBottom: '0.3rem' }}>
              Generating {DIFFICULTY_CONFIG[genProgress.difficulty]?.label || genProgress.difficulty} question...
            </div>
            <div style={{ background: '#e0e7ff', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg, #7c3aed, #6366f1)',
                height: '100%',
                width: `${(genProgress.current / genProgress.total) * 100}%`,
                borderRadius: '999px',
                transition: 'width 0.3s',
              }} />
            </div>
            {genProgress.usedFallback && (
              <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.4rem' }}>
                Some questions used built-in templates due to AI errors
              </p>
            )}
          </div>
        )}
      </div>

      {/* Question Stats */}
      {questions.length > 0 && (
        <div style={{
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
        }}>
          {[
            { label: 'Total', count: questions.length, color: '#6366f1' },
            { label: 'Basic', count: basicCount, color: DIFFICULTY_CONFIG.basic.color },
            { label: 'Intermediate', count: intermediateCount, color: DIFFICULTY_CONFIG.intermediate.color },
            { label: 'Advanced', count: advancedCount, color: DIFFICULTY_CONFIG.advanced.color },
            { label: 'Expert', count: expertCount, color: DIFFICULTY_CONFIG.expert.color },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff',
              borderRadius: '0.7rem',
              padding: '0.8rem',
              textAlign: 'center',
              border: `2px solid ${s.color}30`,
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Add Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#334155', fontWeight: 'bold' }}>Add Question Manually</h3>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            style={{
              background: showManualForm ? '#e2e8f0' : '#6366f1',
              color: showManualForm ? '#334155' : '#fff',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '0.4rem',
              padding: '0.3rem 0.8rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {showManualForm ? 'Collapse' : '+ Add'}
          </button>
        </div>

        {showManualForm && (
          <div style={{
            background: '#fff',
            borderRadius: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            padding: '1.5rem',
          }}>
            <select
              value={newQuestion.difficulty}
              onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
              style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            >
              {DIFFICULTY_OPTIONS.map(d => (
                <option key={d} value={d}>{DIFFICULTY_CONFIG[d].label} - {DIFFICULTY_CONFIG[d].description}</option>
              ))}
            </select>
            <input
              placeholder="Problem Title (e.g., Two Sum, Maximum Subarray)"
              value={newQuestion.title}
              onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })}
              style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
            <textarea
              placeholder={'Problem Description (CodeChef format):\n\nGiven an array of integers, find two numbers that add up to a target.\n\nInput Format:\nThe first line contains N and target.\n\nOutput Format:\nPrint the two indices.\n\nConstraints:\n1 <= N <= 10^4\n\nSample Input:\n4 9\n2 7 11 15\n\nSample Output:\n0 1\n\nExplanation:\n2 + 7 = 9'}
              value={newQuestion.description}
              onChange={e => setNewQuestion({ ...newQuestion, description: e.target.value })}
              style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '150px', fontFamily: 'monospace' }}
            />

            <div style={{ marginBottom: '1rem', background: '#f3f4f6', borderRadius: '0.5rem', padding: '1rem' }}>
              <h4 style={{ fontSize: '1rem', color: '#334155', marginBottom: '0.5rem' }}>Add Test Case</h4>
              <input placeholder="Input" value={testCaseInput} onChange={e => setTestCaseInput(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1' }} />
              <input placeholder="Expected Output" value={testCaseOutput} onChange={e => setTestCaseOutput(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1' }} />
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={testCaseHidden} onChange={e => setTestCaseHidden(e.target.checked)} style={{ marginRight: '0.5rem' }} />
                Hidden Test Case
              </label>
              <button onClick={handleAddTestCase} style={{ background: '#6366f1', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '0.3rem', padding: '0.5rem 1rem', fontSize: '0.95rem', cursor: 'pointer' }}>Add Test Case</button>
              {newQuestion.testCases.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.7rem' }}>
                  {newQuestion.testCases.map((tc, idx) => (
                    <li key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: tc.hidden ? '#fef2f2' : '#f0f4ff',
                      border: `1px solid ${tc.hidden ? '#fca5a5' : '#c7d2fe'}`,
                      borderRadius: '0.3rem', padding: '0.5rem', marginBottom: '0.3rem', fontSize: '0.85rem',
                    }}>
                      <span>
                        <TestCaseBadge hidden={tc.hidden} />
                        <span style={{ marginLeft: '0.4rem' }}>In: <code>{tc.input}</code> | Out: <code>{tc.output}</code></span>
                      </span>
                      <button
                        onClick={() => {
                          setNewQuestion({ ...newQuestion, testCases: newQuestion.testCases.filter((_, i) => i !== idx) });
                        }}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.2rem', padding: '0.15rem 0.4rem', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        X
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={handleAddQuestion}
              disabled={!newQuestion.title || !newQuestion.description}
              style={{
                background: (!newQuestion.title || !newQuestion.description) ? '#94a3b8' : '#6366f1',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.7rem 1.5rem',
                fontSize: '1.05rem',
                marginTop: '0.5rem',
                cursor: (!newQuestion.title || !newQuestion.description) ? 'not-allowed' : 'pointer',
              }}
            >
              Add Question
            </button>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#334155', fontWeight: 'bold' }}>
            Contest Questions ({questions.length})
          </h3>
          {questions.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                background: 'none',
                color: '#ef4444',
                fontWeight: 'bold',
                border: '1px solid #ef4444',
                borderRadius: '0.4rem',
                padding: '0.3rem 0.8rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: '1rem',
            padding: '3rem',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '1rem',
          }}>
            No questions yet. Click <strong>"Generate Questions Automatically"</strong> or add manually above.
          </div>
        ) : (
          questions.map((q, idx) => (
            <QuestionCard
              key={idx}
              question={q}
              index={idx}
              onDelete={handleDeleteQuestion}
              onEdit={handleEditQuestion}
            />
          ))
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={loading || questions.length === 0}
        style={{
          display: 'block',
          margin: '0 auto',
          background: loading || questions.length === 0 ? '#94a3b8' : '#10b981',
          color: '#fff',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '0.7rem',
          padding: '1rem 2.5rem',
          fontSize: '1.2rem',
          cursor: loading || questions.length === 0 ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(16,185,129,0.15)',
        }}
      >
        {loading ? 'Saving...' : `Save ${questions.length} Question${questions.length !== 1 ? 's' : ''} & Schedule`}
      </button>

      {error && (
        <div style={{
          textAlign: 'center',
          color: '#dc2626',
          marginTop: '1rem',
          background: '#fef2f2',
          borderRadius: '0.5rem',
          padding: '0.7rem',
          border: '1px solid #fca5a5',
        }}>
          {error}
        </div>
      )}

      {editingIndex !== null && (
        <EditModal
          question={questions[editingIndex]}
          onSave={handleSaveEdit}
          onClose={() => setEditingIndex(null)}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
