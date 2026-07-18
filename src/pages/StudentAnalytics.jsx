import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Award,
  BookOpen,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { computeCurrentStreak } from '../utils/learningActivity';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ icon: Icon, iconBg, label, value, sub }) => (
  <div className="rounded-xl border bg-white p-5 shadow-sm flex items-start gap-4">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-sm text-slate-500 truncate">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, title, message }) => (
  <div className="rounded-xl border bg-white p-8 shadow-sm flex flex-col items-center text-center">
    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
    <p className="text-sm text-slate-400 mt-1 max-w-xs">{message}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-slate-700">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {entry.value}{entry.name === 'Score' ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

const StudentAnalytics = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [examSubmissions, setExamSubmissions] = useState([]);
  const [learningEvents, setLearningEvents] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    loadAllData();
  }, [user?.id]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [enrollRes, examRes, activityRes] = await Promise.allSettled([
        supabase
          .from('enrollments')
          .select('*, courses(*)')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('exam_submissions')
          .select('id, exam_id, score_percent, passed, submitted_at, next_attempt_allowed_at')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: true }),
        supabase
          .from('learning_activity_events')
          .select('event_type, points_awarded, duration_minutes, occurred_on, created_at')
          .eq('user_id', user.id),
      ]);

      if (enrollRes.status === 'fulfilled') setEnrollments(enrollRes.value.data || []);
      if (examRes.status === 'fulfilled') setExamSubmissions(examRes.value.data || []);
      if (activityRes.status === 'fulfilled') setLearningEvents(activityRes.value.data || []);
    } catch {
      // Gracefully degrade with empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading analytics..." />;

  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter(
    (e) => e.completed || Number(e.progress) >= 100
  ).length;

  const scores = examSubmissions
    .map((s) => Number(s.score_percent))
    .filter((s) => !isNaN(s));
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const totalSubmissions = examSubmissions.length;
  const passedSubmissions = examSubmissions.filter((s) => s.passed).length;

  const streak = computeCurrentStreak(
    learningEvents.map((e) => e.occurred_on || e.created_at)
  );

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekEvents = learningEvents.filter((e) => {
    const d = new Date(e.occurred_on || e.created_at);
    return d >= weekAgo;
  });
  const studyHoursThisWeek =
    weekEvents.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0) / 60;

  // Score trend data for LineChart
  const scoreTrendData = examSubmissions
    .filter((s) => s.submitted_at && s.score_percent != null)
    .map((s) => ({
      date: new Date(s.submitted_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      score: Number(s.score_percent),
      name: s.exam_id ? `Exam ${String(s.exam_id).slice(0, 6)}` : 'Exam',
    }));

  // Course progress for BarChart
  const courseProgressData = enrollments
    .map((e) => ({
      name: e.courses?.title || e.courses?.name || 'Course',
      progress: e.completed || Number(e.progress) >= 100
        ? 100
        : Math.min(Math.max(Number(e.progress) || 0, 0), 100),
    }))
    .slice(0, 12);

  // Subject performance for PieChart (group by course category / subject)
  const subjectScores = {};
  enrollments.forEach((enr) => {
    const subject =
      enr.courses?.category ||
      enr.courses?.subject ||
      enr.courses?.title ||
      'General';
    if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 };
  });
  examSubmissions.forEach((sub) => {
    const matchingEnrollment = enrollments.find(
      (e) => e.course_id === sub.exam_id || e.courses?.id === sub.exam_id
    );
    const subject =
      matchingEnrollment?.courses?.category ||
      matchingEnrollment?.courses?.subject ||
      matchingEnrollment?.courses?.title ||
      'General';
    if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 };
    subjectScores[subject].total += Number(sub.score_percent) || 0;
    subjectScores[subject].count += 1;
  });
  const subjectPerformanceData = Object.entries(subjectScores)
    .map(([name, { total, count }]) => ({
      name,
      value: count > 0 ? Math.round(total / count) : 0,
    }))
    .filter((s) => s.value > 0);

  // Weak areas (avg score < 50 per subject)
  const weakAreas = subjectPerformanceData.filter((s) => s.value < 50);

  // Strengths (avg score > 80 per subject)
  const strengths = subjectPerformanceData.filter((s) => s.value > 80);

  // Recent activity timeline
  const recentExams = [...examSubmissions]
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 10);

  const hasAnyData = totalCourses > 0 || totalSubmissions > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Analytics</h1>
        <p className="text-slate-500">Track your performance, progress, and learning patterns</p>
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          message="Enroll in a course and take an exam to see your analytics dashboard come to life."
        />
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={BookOpen}
              iconBg="bg-blue-500"
              label="Courses Enrolled"
              value={totalCourses}
              sub={`${completedCourses} completed`}
            />
            <StatCard
              icon={TrendingUp}
              iconBg="bg-emerald-500"
              label="Average Score"
              value={`${avgScore}%`}
              sub={`${passedSubmissions}/${totalSubmissions} exams passed`}
            />
            <StatCard
              icon={Clock}
              iconBg="bg-amber-500"
              label="Study Hours (7d)"
              value={studyHoursThisWeek.toFixed(1)}
              sub="Estimated from activity"
            />
            <StatCard
              icon={Target}
              iconBg="bg-purple-500"
              label="Current Streak"
              value={`${streak}d`}
              sub={streak > 0 ? 'Keep it up!' : 'Start studying today!'}
            />
          </div>

          {/* Charts Row 1: Score Trend + Course Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Trend Line Chart */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Score Trend</h2>
              {scoreTrendData.length === 0 ? (
                <div className="flex items-center justify-center h-56 text-slate-400 text-sm">
                  No exam scores recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={scoreTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Course Progress Bar Chart */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Course Progress</h2>
              {courseProgressData.length === 0 ? (
                <div className="flex items-center justify-center h-56 text-slate-400 text-sm">
                  No enrolled courses yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={courseProgressData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={100}
                      stroke="#94a3b8"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="progress" name="Progress %" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Charts Row 2: Subject Performance Pie Chart */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Subject Performance</h2>
            {subjectPerformanceData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-slate-400 text-sm">
                Take exams to see performance breakdown by subject.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subjectPerformanceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={50}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                      labelLine
                    >
                      {subjectPerformanceData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Weak Areas & Strengths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weak Areas */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-semibold text-slate-800">Areas to Improve</h2>
              </div>
              {weakAreas.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  No weak areas detected. Great job!
                </p>
              ) : (
                <ul className="space-y-3">
                  {weakAreas.map((area) => (
                    <li
                      key={area.name}
                      className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-700">{area.name}</span>
                      <span className="text-sm font-bold text-amber-600">{area.value}%</span>
                    </li>
                  ))}
                </ul>
              )}
              {weakAreas.length > 0 && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Tip: Revisit the course materials, take practice tests, and focus on the topics
                    where you scored below 50%.
                  </p>
                </div>
              )}
            </div>

            {/* Strengths */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-semibold text-slate-800">Strengths</h2>
              </div>
              {strengths.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  Keep studying to build your strengths.
                </p>
              ) : (
                <ul className="space-y-3">
                  {strengths.map((area) => (
                    <li
                      key={area.name}
                      className="flex items-center justify-between bg-emerald-50 rounded-lg px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-700">{area.name}</span>
                      <span className="text-sm font-bold text-emerald-600">{area.value}%</span>
                    </li>
                  ))}
                </ul>
              )}
              {strengths.length > 0 && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Excellent work! You've scored above 80% in these areas. Consider mentoring peers
                    or exploring advanced topics.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-semibold text-slate-800">Recent Exam Activity</h2>
            </div>
            {recentExams.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No exam submissions yet. Take your first exam to get started!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Exam</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExams.map((exam) => {
                      const date = new Date(exam.submitted_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      const score = exam.score_percent != null ? `${exam.score_percent}%` : 'N/A';
                      return (
                        <tr key={exam.id} className="border-b last:border-0">
                          <td className="py-3 text-slate-600">{date}</td>
                          <td className="py-3 text-slate-700 font-medium">
                            {exam.exam_id ? `Exam ${String(exam.exam_id).slice(0, 8)}` : 'Exam'}
                          </td>
                          <td className="py-3 font-semibold text-slate-800">{score}</td>
                          <td className="py-3">
                            {exam.passed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle className="w-3.5 h-3.5" /> Passed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentAnalytics;
