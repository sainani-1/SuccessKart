import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Code2, Eye, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { fetchAttemptsForContest } from '../../utils/dcs';

const statusChip = (accepted) =>
  accepted
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-rose-100 text-rose-700 border-rose-200';

const AttemptsPanel = ({ contestId, questions = [], teacherId = null, reloadToken = 0 }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(!!contestId);
  const [openAttemptId, setOpenAttemptId] = useState(null);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  const load = useCallback(async () => {
    if (!contestId) {
      setAttempts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchAttemptsForContest(contestId, { teacherId });
      setAttempts(rows);
    } finally {
      setLoading(false);
    }
  }, [contestId, teacherId]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const questionTitle = (questionId) =>
    questions.find((question) => String(question.id) === String(questionId))?.title || 'Unknown question';

  const openAttempt = attempts.find((attempt) => attempt.id === openAttemptId) || null;
  const openResults = Array.isArray(openAttempt?.test_results) ? openAttempt.test_results : [];
  const activeQuestionIdSafe =
    activeQuestionId && openResults.some((result) => String(result.questionId) === String(activeQuestionId))
      ? activeQuestionId
      : openResults[0]?.questionId || null;

  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Eye size={18} /> Student Attempts
          </h3>
          <p className="text-xs text-slate-500">
            Score and submitted code for this contest.
            {teacherId ? ' Scoped to your assigned students.' : ' All students.'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-6 text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading attempts…
        </div>
      ) : attempts.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No attempts for this contest yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Passed</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Language</th>
                <th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => {
                const isOpen = attempt.id === openAttemptId;
                const results = Array.isArray(attempt.test_results) ? attempt.test_results : [];
                const passedCount = results.filter((result) => result?.accepted).length;
                return (
                  <FragmentRow
                    key={attempt.id}
                    attempt={attempt}
                    isOpen={isOpen}
                    passedCount={passedCount}
                    questionCount={questions.length}
                    onToggle={() => {
                      setOpenAttemptId(isOpen ? null : attempt.id);
                      setActiveQuestionId(null);
                    }}
                    questionTitle={questionTitle}
                    activeQuestionId={activeQuestionIdSafe}
                    onSelectQuestion={setActiveQuestionId}
                    results={results}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const FragmentRow = ({
  attempt,
  isOpen,
  passedCount,
  questionCount,
  onToggle,
  questionTitle,
  activeQuestionId,
  onSelectQuestion,
  results,
}) => {
  const profile = attempt.profiles || {};
  const activeResult = results.find((result) => String(result.questionId) === String(activeQuestionId));
  const code = attempt.answers?.[activeQuestionId] || '';

  return (
    <>
      <tr
        className="border-b last:border-0 cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <td className="py-2.5 pr-4">
          <span className="flex items-center gap-2">
            {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            <span>
              <span className="font-semibold text-slate-800">{profile.full_name || 'Student'}</span>
              <span className="block text-xs text-slate-400">{profile.email}</span>
            </span>
          </span>
        </td>
        <td className="py-2.5 pr-4 font-bold text-slate-800">{attempt.score || 0} pts</td>
        <td className="py-2.5 pr-4 text-slate-600">
          {passedCount}/{questionCount || results.length || '—'}
        </td>
        <td className="py-2.5 pr-4">
          <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${statusChip(attempt.submission_status === 'accepted')}`}>
            {attempt.submission_status || 'draft'}
          </span>
        </td>
        <td className="py-2.5 pr-4 text-slate-600 uppercase text-xs">{attempt.language || '—'}</td>
        <td className="py-2.5 text-slate-500 whitespace-nowrap text-xs">
          {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-b last:border-0 bg-slate-50/70">
          <td colSpan={6} className="p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {results.length === 0 ? (
                <span className="text-xs text-slate-500">No judged questions stored for this attempt.</span>
              ) : (
                results.map((result) => (
                  <button
                    key={String(result.questionId)}
                    type="button"
                    onClick={() => onSelectQuestion(result.questionId)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition ${
                      String(result.questionId) === String(activeQuestionId)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                    }`}
                    title={questionTitle(result.questionId)}
                  >
                    {result.accepted ? (
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    ) : (
                      <XCircle size={13} className="text-rose-500" />
                    )}
                    {questionTitle(result.questionId)}
                  </button>
                ))
              )}
            </div>

            {activeResult ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-bold uppercase text-[10px] text-slate-400 mb-1">Visible tests</p>
                  <p className="font-bold text-slate-800">
                    {activeResult.visiblePassed ?? 0}/{activeResult.visibleTotal ?? 6}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-bold uppercase text-[10px] text-slate-400 mb-1">Hidden tests</p>
                  <p className="font-bold text-slate-800">
                    {activeResult.hiddenPassed ?? 0}/{activeResult.hiddenTotal ?? 35}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-bold uppercase text-[10px] text-slate-400 mb-1">Result</p>
                  <p className={`font-bold ${activeResult.accepted ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {activeResult.accepted ? 'Accepted' : 'Not accepted'}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 mb-2">
                <Code2 size={12} /> Submitted code
              </p>
              {String(code).trim() ? (
                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-100 leading-5 max-h-80 overflow-auto">
                  {code}
                </pre>
              ) : (
                <p className="text-xs text-slate-400">No code saved for this question.</p>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
};

export default AttemptsPanel;
