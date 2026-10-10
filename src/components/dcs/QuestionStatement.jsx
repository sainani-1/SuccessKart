import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Lock,
  MessageSquare,
  Trophy,
  Wrench,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { DCS_DIFFICULTIES, cleanProblemTitle } from '../../utils/dcs';
import { VISIBLE_TEST_COUNT, HIDDEN_TEST_COUNT } from '../../utils/dcsPool';

const difficultyStyle = (difficulty) => {
  if (difficulty === 'medium') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (difficulty === 'hard') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

const TABS = [
  { key: 'description', label: 'Description', icon: Code2 },
  { key: 'solutions', label: 'Solutions', icon: Wrench },
  { key: 'discussion', label: 'Discussion', icon: MessageSquare },
];

const QuestionStatement = ({
  question,
  contestId,
  siblings = [],
  solved = false,
  attempted = false,
  onSelectSibling,
}) => {
  const [tab, setTab] = useState('description');
  const [openHints, setOpenHints] = useState({});
  const [stats, setStats] = useState({});

  const questionId = question?.id;

  useEffect(() => {
    setTab('description');
    setOpenHints({});
  }, [questionId]);

  useEffect(() => {
    if (!contestId) return undefined;
    let cancelled = false;
    supabase
      .rpc('dcs_question_stats', { p_contest_id: contestId })
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return;
        setStats(Object.fromEntries(data.map((row) => [row.question_id, row])));
      });
    return () => {
      cancelled = true;
    };
  }, [contestId]);

  const examples = useMemo(() => {
    const list = Array.isArray(question?.examples) ? question.examples.filter(Boolean) : [];
    if (list.length) return list;
    return [
      {
        input: question?.sample_input || '',
        output: question?.sample_output || '',
        explanation: '',
      },
    ];
  }, [question]);

  const topics = Array.isArray(question?.topics) ? question.topics : [];
  const hints = Array.isArray(question?.hints) ? question.hints : [];
  const companies = Array.isArray(question?.companies) ? question.companies : [];

  const row = stats[questionId] || null;
  const attempts = Number(row?.attempts || 0);
  const accepted = Number(row?.accepted || 0);
  const acceptance = attempts ? Math.round((accepted / attempts) * 1000) / 10 : 0;

  const points =
    DCS_DIFFICULTIES.find((level) => level.key === question?.difficulty)?.points || 10;

  const constraints = useMemo(() => {
    const raw = String(question?.constraints || '').trim();
    if (!raw) return [];
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*•–]\s*/, ''))
      .filter(Boolean);
  }, [question]);

  if (!question) return null;

  const statusLabel = solved ? 'Solved' : attempted ? 'Attempted' : 'Todo';

  return (
    <div className="bg-white">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{cleanProblemTitle(question.title)}</h1>
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${
              solved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : attempted
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {solved ? <CheckCircle2 size={12} /> : <Code2 size={12} />} {statusLabel}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${difficultyStyle(question.difficulty)}`}>
            {question.difficulty}
          </span>
          {topics.map((topic) => (
            <span
              key={topic}
              className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition"
            >
              {topic}
            </span>
          ))}
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            {VISIBLE_TEST_COUNT} shown · {HIDDEN_TEST_COUNT} hidden
          </span>
        </div>

        {companies.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 uppercase tracking-wide text-[10px] font-bold">Companies</span>
            {companies.map((company) => (
              <span key={company} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <Building2 size={11} /> {company}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-b border-slate-200 px-5 flex gap-5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 -mb-px border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition ${
              tab === key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'description' ? (
        <div className="px-5 py-5 text-[14px] leading-7 text-slate-700 space-y-5">
          <p className="whitespace-pre-line">{question.description}</p>

          {examples.map((example, index) => (
            <div key={index}>
              <p className="font-semibold text-slate-900">Example {index + 1}:</p>
              <div className="mt-2 space-y-1.5">
                <pre className="block border-l-4 border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800 whitespace-pre-wrap rounded-r-md">
                  <span className="font-sans font-semibold">Input: </span>
                  {example?.input || '(no input)'}
                </pre>
                <pre className="block border-l-4 border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800 whitespace-pre-wrap rounded-r-md">
                  <span className="font-sans font-semibold">Output: </span>
                  {example?.output}
                </pre>
                {example?.explanation ? (
                  <p className="pt-1">
                    <span className="font-semibold text-slate-900">Explanation: </span>
                    {example.explanation}
                  </p>
                ) : null}
              </div>
            </div>
          ))}

          {constraints.length ? (
            <div>
              <p className="font-semibold text-slate-900">Constraints:</p>
              <ul className="mt-1.5 space-y-1">
                {constraints.map((constraint, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="shrink-0 text-slate-400">{'\u2022'}</span>
                    <span className="font-mono text-[13px]">{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {question.input_format || question.output_format ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
              {question.input_format ? (
                <div>
                  <p className="font-semibold text-slate-900 mb-1">Input Format</p>
                  <p className="whitespace-pre-line text-slate-600 leading-6">{question.input_format}</p>
                </div>
              ) : null}
              {question.output_format ? (
                <div>
                  <p className="font-semibold text-slate-900 mb-1">Output Format</p>
                  <p className="whitespace-pre-line text-slate-600 leading-6">{question.output_format}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {hints.length ? (
            <div>
              <p className="font-semibold text-slate-900 mb-2">Hints</p>
              <div className="space-y-2">
                {hints.map((hint, index) => {
                  const open = !!openHints[index];
                  return (
                    <div key={index} className="rounded-lg border border-amber-200 bg-amber-50/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenHints((prev) => ({ ...prev, [index]: !open }))}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-xs font-bold text-amber-800 hover:bg-amber-100/60 transition"
                      >
                        Hint {index + 1}
                        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {open ? (
                        <p className="px-3.5 pb-3 text-[13px] text-amber-900 leading-6">{hint}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span>
              Accepted <span className="font-bold text-emerald-600">{accepted}</span>
            </span>
            <span>
              Acceptance Rate{' '}
              <span className="font-bold text-slate-800">{attempts ? `${acceptance}%` : '\u2014'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy size={13} className="text-gold-500" />
              <span>
                <span className="font-bold text-slate-800">{points}</span> points
              </span>
            </span>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Similar Questions</p>
            {siblings.length ? (
              <div className="flex flex-wrap gap-2">
                {siblings.map((sibling) => (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => onSelectSibling?.(sibling)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold transition ${
                      sibling.id === question.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-700'
                    }`}
                  >
                    {cleanProblemTitle(sibling.title)}
                    {sibling.id !== question.id ? <Lock size={10} className="text-slate-400" /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No similar questions in today’s set.</p>
            )}
          </div>

          {companies.length ? (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Companies</p>
              <div className="flex flex-wrap gap-2">
                {companies.map((company) => (
                  <span key={company} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                    <Building2 size={11} /> {company}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'solutions' ? (
        <div className="px-5 py-10 text-center text-slate-500">
          <Wrench className="mx-auto mb-2 text-slate-300" size={30} />
          <p className="text-sm font-semibold">No official solutions published yet.</p>
          <p className="text-xs mt-1">Your submitted code stays private until you share it.</p>
        </div>
      ) : null}

      {tab === 'discussion' ? (
        <div className="px-5 py-10 text-center text-slate-500">
          <MessageSquare className="mx-auto mb-2 text-slate-300" size={30} />
          <p className="text-sm font-semibold">Be the first to start a discussion.</p>
          <p className="text-xs mt-1">Ask for hints or share your approach after you submit.</p>
        </div>
      ) : null}
    </div>
  );
};

export default QuestionStatement;