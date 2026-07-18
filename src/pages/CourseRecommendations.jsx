import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, BookOpen, Star, ArrowRight, RefreshCw } from 'lucide-react';

const CATEGORY_COLORS = {
  Programming: { from: 'from-blue-500', to: 'to-indigo-600', badge: 'bg-blue-100 text-blue-700' },
  Web: { from: 'from-emerald-500', to: 'to-teal-600', badge: 'bg-emerald-100 text-emerald-700' },
  'CS Core': { from: 'from-purple-500', to: 'to-violet-600', badge: 'bg-purple-100 text-purple-700' },
  'Data Science': { from: 'from-amber-500', to: 'to-orange-600', badge: 'bg-amber-100 text-amber-700' },
  Data: { from: 'from-cyan-500', to: 'to-sky-600', badge: 'bg-cyan-100 text-cyan-700' },
  DevOps: { from: 'from-rose-500', to: 'to-pink-600', badge: 'bg-rose-100 text-rose-700' },
  Cloud: { from: 'from-sky-500', to: 'to-blue-600', badge: 'bg-sky-100 text-sky-700' },
  Security: { from: 'from-red-500', to: 'to-rose-600', badge: 'bg-red-100 text-red-700' },
  Mobile: { from: 'from-violet-500', to: 'to-purple-600', badge: 'bg-violet-100 text-violet-700' },
  Design: { from: 'from-pink-500', to: 'to-fuchsia-600', badge: 'bg-pink-100 text-pink-700' },
  'Emerging Tech': { from: 'from-teal-500', to: 'to-cyan-600', badge: 'bg-teal-100 text-teal-700' },
  Productivity: { from: 'from-slate-500', to: 'to-gray-600', badge: 'bg-slate-100 text-slate-700' },
};

const DEFAULT_COLOR = { from: 'from-gray-500', to: 'to-gray-600', badge: 'bg-gray-100 text-gray-700' };

const QUICK_CATEGORIES = [
  { name: 'Programming', icon: '💻' },
  { name: 'Web', icon: '🌐' },
  { name: 'CS Core', icon: '🖥️' },
  { name: 'Data Science', icon: '📊' },
  { name: 'Cloud', icon: '☁️' },
  { name: 'DevOps', icon: '⚙️' },
  { name: 'Security', icon: '🔒' },
  { name: 'Mobile', icon: '📱' },
];

const StarRating = ({ rating }) => {
  const stars = [];
  const r = Number(rating) || 0;
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        size={14}
        className={i <= Math.round(r) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const CategoryBar = ({ category }) => {
  const c = CATEGORY_COLORS[category] || DEFAULT_COLOR;
  return (
    <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${c.from} ${c.to}`} />
  );
};

const Badge = ({ category }) => {
  const c = CATEGORY_COLORS[category] || DEFAULT_COLOR;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>
      {category}
    </span>
  );
};

const RecommendationCard = ({ course, reason }) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all flex flex-col">
    <CategoryBar category={course.category} />
    <div className="mt-3 flex-1">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{course.title}</h3>
        <Badge category={course.category} />
      </div>
      {reason && (
        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{reason}</p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <BookOpen size={12} /> {course.lessons || 0} lessons
        </span>
        {course.rating && (
          <span className="flex items-center gap-1">
            <StarRating rating={course.rating} />
            <span className="ml-0.5">{Number(course.rating).toFixed(1)}</span>
          </span>
        )}
      </div>
    </div>
    <Link
      to={`/app/courses/${course.id}`}
      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
    >
      View Course <ArrowRight size={12} />
    </Link>
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
      <Icon size={20} className="text-indigo-600" />
    </div>
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    <p className="mt-4 text-sm text-gray-500">Analyzing your learning profile...</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
    <BookOpen size={40} className="mx-auto text-gray-400" />
    <p className="mt-3 text-sm text-gray-500">{message}</p>
  </div>
);

const CourseRecommendations = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [enrollRes, examRes, courseRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('course_id, courses(id, title, category, rating, lessons)')
          .eq('user_id', user.id),
        supabase.from('exam_results').select('*').eq('user_id', user.id),
        supabase.from('courses').select('id, title, category, rating, lessons, description').eq('is_active', true),
      ]);

      const enrolled = (enrollRes.data || []).filter(e => e.courses);
      setEnrollments(enrolled);
      setExamResults(examRes.data || []);
      setAllCourses(courseRes.data || []);
    } catch (err) {
      console.error('Error fetching recommendation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map(e => e.course_id)),
    [enrollments]
  );

  const enrolledCategories = useMemo(
    () => [...new Set(enrollments.map(e => e.courses?.category).filter(Boolean))],
    [enrollments]
  );

  const categoryStats = useMemo(() => {
    const stats = {};
    enrollments.forEach(e => {
      const cat = e.courses?.category;
      if (!cat) return;
      if (!stats[cat]) stats[cat] = { count: 0, totalRating: 0 };
      stats[cat].count += 1;
    });
    return stats;
  }, [enrollments]);

  const weakCategories = useMemo(() => {
    if (!examResults.length) return [];
    const catScores = {};
    examResults.forEach(r => {
      const cat = r.category || r.subject;
      if (!cat) return;
      if (!catScores[cat]) catScores[cat] = { total: 0, count: 0 };
      catScores[cat].total += (r.score || r.percentage || 0);
      catScores[cat].count += 1;
    });
    return Object.entries(catScores)
      .map(([cat, s]) => ({ category: cat, avg: s.total / s.count }))
      .filter(s => s.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .map(s => s.category);
  }, [examResults]);

  const strongCategories = useMemo(() => {
    if (!examResults.length) return [];
    const catScores = {};
    examResults.forEach(r => {
      const cat = r.category || r.subject;
      if (!cat) return;
      if (!catScores[cat]) catScores[cat] = { total: 0, count: 0 };
      catScores[cat].total += (r.score || r.percentage || 0);
      catScores[cat].count += 1;
    });
    return Object.entries(catScores)
      .map(([cat, s]) => ({ category: cat, avg: s.total / s.count }))
      .filter(s => s.avg >= 75)
      .sort((a, b) => b.avg - a.avg)
      .map(s => s.category);
  }, [examResults]);

  const aiRecommendations = useMemo(() => {
    const available = allCourses.filter(c => !enrolledCourseIds.has(c.id));
    if (!available.length) return [];

    const scored = available.map(course => {
      let score = 0;
      let reasons = [];

      if (enrolledCategories.includes(course.category)) {
        score += 5;
        reasons.push(`Based on your interest in ${course.category}`);
      }

      if (strongCategories.includes(course.category)) {
        score += 4;
        reasons.push(`You excel in ${course.category} — try an advanced course`);
      }

      if (weakCategories.includes(course.category)) {
        score += 3;
        reasons.push(`Strengthen your ${course.category} fundamentals`);
      }

      score += (Number(course.rating) || 0) * 0.5;

      return { ...course, score, reason: reasons[0] || `Popular in ${course.category}` };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 9);
  }, [allCourses, enrolledCourseIds, enrolledCategories, strongCategories, weakCategories]);

  const trendingCourses = useMemo(() => {
    const available = allCourses.filter(c => !enrolledCourseIds.has(c.id));
    return [...available]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 5);
  }, [allCourses, enrolledCourseIds]);

  const similarToEnrolled = useMemo(() => {
    if (!enrolledCategories.length) return [];
    const available = allCourses.filter(c => !enrolledCourseIds.has(c.id));
    const result = [];
    enrolledCategories.forEach(cat => {
      const sameCat = available.filter(c => c.category === cat).slice(0, 3);
      sameCat.forEach(c => {
        result.push({ ...c, reason: `Similar to your ${cat} course` });
      });
    });
    return result.slice(0, 9);
  }, [allCourses, enrolledCourseIds, enrolledCategories]);

  const skillGapCourses = useMemo(() => {
    if (!weakCategories.length) return [];
    const available = allCourses.filter(c => !enrolledCourseIds.has(c.id));
    const result = [];
    weakCategories.forEach(cat => {
      const matches = available.filter(c => c.category === cat).slice(0, 2);
      matches.forEach(c => {
        result.push({ ...c, reason: `Covers weak area: ${cat}` });
      });
    });
    return result;
  }, [allCourses, enrolledCourseIds, weakCategories]);

  const filteredCourses = useMemo(() => {
    if (!activeCategory) return allCourses;
    return allCourses.filter(c => c.category === activeCategory);
  }, [allCourses, activeCategory]);

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Recommendations</h1>
            <p className="text-sm text-gray-500 mt-1">Personalized suggestions based on your learning journey</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="space-y-10">

          <section>
            <SectionHeader
              icon={Sparkles}
              title="AI-Powered Picks"
              subtitle="Curated based on your profile and learning history"
            />
            {aiRecommendations.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {aiRecommendations.map(c => (
                  <RecommendationCard key={c.id} course={c} reason={c.reason} />
                ))}
              </div>
            ) : (
              <EmptyState message="Enroll in courses to get personalized AI recommendations." />
            )}
          </section>

          <section>
            <SectionHeader
              icon={TrendingUp}
              title="Trending Courses"
              subtitle="Top-rated courses loved by students"
            />
            {trendingCourses.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {trendingCourses.map(c => (
                  <RecommendationCard key={c.id} course={c} reason="Highly rated" />
                ))}
              </div>
            ) : (
              <EmptyState message="No trending courses available right now." />
            )}
          </section>

          {similarToEnrolled.length > 0 && (
            <section>
              <SectionHeader
                icon={BookOpen}
                title="Courses Similar to Your Enrolled"
                subtitle="More courses in categories you're learning"
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {similarToEnrolled.map(c => (
                  <RecommendationCard key={c.id} course={c} reason={c.reason} />
                ))}
              </div>
            </section>
          )}

          {skillGapCourses.length > 0 && (
            <section>
              <SectionHeader
                icon={TrendingUp}
                title="Skill Gap Analysis"
                subtitle="Strengthen your weak areas with these courses"
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {skillGapCourses.map(c => (
                  <RecommendationCard key={c.id} course={c} reason={c.reason} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeader
              icon={BookOpen}
              title="Browse by Category"
              subtitle="Explore courses by topic"
            />
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  !activeCategory
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {QUICK_CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                    activeCategory === cat.name
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
            {filteredCourses.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map(c => (
                  <RecommendationCard key={c.id} course={c} reason={null} />
                ))}
              </div>
            ) : (
              <EmptyState message="No courses found in this category." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CourseRecommendations;
