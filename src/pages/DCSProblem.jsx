import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import QuestionStatement from '../components/dcs/QuestionStatement';
import CodeWorkspace from '../components/dcs/CodeWorkspace';
import {
  DCS_DIFFICULTIES,
  cleanProblemTitle,
  fetchLiveContest,
  fetchMyAttempts,
  scoreFromJudgeResults,
} from '../utils/dcs';
import { isDefaultSnippet } from '../utils/dcsSnippets';
import { readAllDrafts } from '../utils/dcsDrafts';

// Fullscreen LeetCode style workspace: problem statement on the left, code
// editor on the right. Opened in a new tab from the Daily Coding Streak page.
const DCSProblem = () => {
  const { user } = useAuth();
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [judgedResults, setJudgedResults] = useState({});
  const [myAttempt, setMyAttempt] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [contestData, attemptData] = await Promise.all([
        fetchLiveContest(),
        fetchMyAttempts(user.id, 10),
      ]);
      setContest(contestData.contest);
      setQuestions(contestData.questions || []);
      const liveAttempt = (attemptData || []).find(
        (attempt) => attempt.contest_id === contestData.contest?.id
      );
      setMyAttempt(liveAttempt || null);
      // Restore saved code question by question. Pre-filled starter snippets are
      // only placeholders, so a real saved answer always wins over them, while
      // code the student is currently typing is never overwritten. Drafts from
      // the same device take priority so closing the tab never loses work.
      if (liveAttempt?.answers || readAllDrafts(contestData.contest?.id)) {
        const drafts = readAllDrafts(contestData.contest?.id) || {};
        setAnswers((prev) => {
          const next = { ...prev };
          Object.entries(liveAttempt?.answers || {}).forEach(([id, code]) => {
            if (!code || isDefaultSnippet(code)) return;
            const current = next[id];
            if (current === undefined || isDefaultSnippet(current)) next[id] = code;
          });
          Object.entries(drafts).forEach(([id, draft]) => {
            if (draft?.code && !isDefaultSnippet(draft.code)) next[id] = draft.code;
          });
          return next;
        });
      }
      const savedResults = {};
      (liveAttempt?.test_results || []).forEach((result) => {
        if (result && result.questionId) savedResults[result.questionId] = result;
      });
      setJudgedResults((prev) => ({ ...savedResults, ...prev }));
    } catch {
      // keep last known state
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const groupedQuestions = useMemo(
    () =>
      DCS_DIFFICULTIES.map((level) => ({
        ...level,
        items: questions
          .filter((question) => question.difficulty === level.key)
          .sort((a, b) => (a.position || 0) - (b.position || 0)),
      })).filter((group) => group.items.length > 0),
    [questions]
  );
  const allQuestions = useMemo(
    () => groupedQuestions.flatMap((group) => group.items),
    [groupedQuestions]
  );
  const currentIndex = allQuestions.findIndex((question) => question.id === questionId);
  const question = currentIndex >= 0 ? allQuestions[currentIndex] : null;
  const previousQuestion = currentIndex > 0 ? allQuestions[currentIndex - 1] : null;
  const nextQuestion =
    currentIndex >= 0 && currentIndex < allQuestions.length - 1
      ? allQuestions[currentIndex + 1]
      : null;

  const liveScore = useMemo(
    () =>
      scoreFromJudgeResults(
        questions,
        Object.entries(judgedResults).map(([id, result]) => ({
          questionId: id,
          accepted: !!result?.accepted,
        }))
      ),
    [questions, judgedResults]
  );

  const handleSubmitted = ({ result, submissionStatus }) => {
    setMyAttempt((prev) => ({
      ...(prev || {}),
      contest_id: contest?.id,
      score: result.score,
      answers,
      submission_status: submissionStatus,
      updated_at: new Date().toISOString(),
    }));
    refresh();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading problem…
      </div>
    );
  }

  const notAvailable = !contest || contest.status !== 'live' || !allQuestions.length;

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="h-14 px-3 sm:px-4 flex items-center gap-3">
          <Link
            to="/app/daily-coding-streak"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 shrink-0"
          >
            <ArrowLeft size={17} /> <span className="hidden sm:inline">Daily Coding Streak</span>
          </Link>

          <span className="h-5 w-px bg-slate-200 shrink-0" />

          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">
              {currentIndex >= 0 ? `${currentIndex + 1}.` : ''}
            </span>
            <h1 className="truncate font-semibold text-slate-900">
              {cleanProblemTitle(question?.title || '') || contest?.title || 'Problem'}
            </h1>
            {question ? (
              <span
                className={`hidden sm:inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  question.difficulty === 'hard'
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : question.difficulty === 'medium'
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}
              >
                {question.difficulty}
              </span>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Trophy size={13} className="text-gold-500" /> {liveScore} pts
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
              <Flame size={13} /> {myAttempt?.submission_status === 'accepted' ? 'Practiced' : 'In progress'}
            </span>
            <div className="flex items-center">
              {previousQuestion ? (
                <Link
                  to={`/dcs/problem/${previousQuestion.id}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-l-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  title={previousQuestion.title}
                >
                  <ChevronLeft size={16} />
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-l-lg border border-slate-200 text-slate-300">
                  <ChevronLeft size={16} />
                </span>
              )}
              {nextQuestion ? (
                <Link
                  to={`/dcs/problem/${nextQuestion.id}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-r-lg border border-l-0 border-slate-200 text-slate-500 hover:bg-slate-50"
                  title={nextQuestion.title}
                >
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-r-lg border border-l-0 border-slate-200 text-slate-300">
                  <ChevronRight size={16} />
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 min-h-[75vh] overflow-y-auto lg:overflow-hidden">
        <section className="lg:overflow-y-auto lg:border-r border-slate-200 bg-white p-3 sm:p-4">
          {notAvailable ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              <p className="font-semibold text-slate-700">
                {!contest
                  ? 'No coding contest is available right now.'
                  : 'Today’s contest is not open for submissions.'}
              </p>
              <p className="text-sm mt-1">Check back on the Daily Coding Streak page.</p>
              <Link
                to="/app/daily-coding-streak"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                <ArrowLeft size={15} /> Back to Daily Coding Streak
              </Link>
            </div>
          ) : question ? (
            <QuestionStatement
              question={question}
              contestId={contest.id}
              siblings={allQuestions}
              solved={!!judgedResults[question.id]?.accepted}
              attempted={judgedResults[question.id] !== undefined}
              onSelectSibling={(sibling) => navigate(`/dcs/problem/${sibling.id}`)}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              <p className="font-semibold text-slate-700">Problem not found.</p>
              <p className="text-sm mt-1">It may belong to a different day’s contest.</p>
              <Link
                to="/app/daily-coding-streak"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                <ArrowLeft size={15} /> Back to Daily Coding Streak
              </Link>
            </div>
          )}
        </section>

        <section className="lg:overflow-y-auto bg-white p-3 sm:p-4">
          {question ? (
            <div className="space-y-3">
              {notice ? (
                <p
                  className={`text-sm font-medium ${
                    /not accepted|could not|write code/i.test(notice) ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {notice}
                </p>
              ) : null}
              <CodeWorkspace
                contest={contest}
                question={question}
                questions={allQuestions}
                answers={answers}
                onAnswersChange={setAnswers}
                judgedResults={judgedResults}
                onJudgedChange={setJudgedResults}
                onNotice={setNotice}
                onSubmitted={handleSubmitted}
              />
              <p className="text-xs text-slate-400 text-center lg:text-left">
                {allQuestions.filter((item) => judgedResults[item.id]?.accepted).length}/
                {allQuestions.length} solved today · Score {liveScore} pts
              </p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Open a problem to start coding.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DCSProblem;
