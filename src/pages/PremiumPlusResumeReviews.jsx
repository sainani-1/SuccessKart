import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Upload, Eye, Sparkles, Brain, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import PremiumPlusUpgradeGate from '../components/PremiumPlusUpgradeGate';
import { sendAdminNotification } from '../utils/adminNotifications';
import {
  RESUME_REVIEW_LIMIT,
  canUseCareerSupport,
  formatCareerCycle,
  formatResumeForAI,
  getCareerCycleMonth,
  isCareerStaff,
  notifyCareerTeacher,
  readBuilderResume,
  scoreResume,
} from '../utils/careerSupport';

const formatDate = (value) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

const ResumePreview = ({ resume, profile, user }) => {
  if (!resume) {
    return <p className="text-sm text-slate-500">No resume builder data found yet. Open Resume Builder and save your details first.</p>;
  }
  const skillList = (resume.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Your Name';
  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-3 md:p-4 shadow-inner">
      <div className="mx-auto w-full max-w-[850px] bg-white min-h-[600px] overflow-hidden rounded-xl border border-slate-300 shadow-xl">
        <div className="border-b border-slate-300 px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Professional Resume</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-serif font-bold text-slate-950">{fullName}</h2>
              <p className="mt-1 text-lg text-slate-600">{resume.role}</p>
            </div>
            <div className="text-sm leading-7 text-slate-600 md:text-right">
              <p>{resume.email || 'Email not added'}</p>
              <p>{resume.phone || 'Phone not added'}</p>
              <p>{resume.location || 'Location not added'}</p>
              <p>{resume.linkedin || 'LinkedIn not added'}</p>
              <p>{resume.portfolio || 'Portfolio not added'}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-0">
          <div className="px-6 py-6 md:px-8 md:py-8 space-y-6">
            <div>
              <p className="font-bold text-slate-900 mb-2">Profile Summary</p>
              <p className="text-slate-700 leading-7">{resume.summary}</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-2">Experience</p>
              <div className="space-y-4">
                <div className="border-l-2 border-slate-300 pl-4">
                  <p className="font-bold text-slate-900">{resume.experience1Title || 'Role not added'} <span className="font-normal text-slate-500">— {resume.experience1Company || 'Organization not added'}</span></p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{resume.experience1Period || 'Period not added'}</p>
                  <p className="mt-2 text-slate-700 leading-7 whitespace-pre-line">{resume.experience1Description || 'Description not added'}</p>
                </div>
                <div className="border-l-2 border-slate-300 pl-4">
                  <p className="font-bold text-slate-900">{resume.experience2Title || 'Role not added'} <span className="font-normal text-slate-500">— {resume.experience2Company || 'Organization not added'}</span></p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{resume.experience2Period || 'Period not added'}</p>
                  <p className="mt-2 text-slate-700 leading-7 whitespace-pre-line">{resume.experience2Description || 'Description not added'}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-2">Selected Projects</p>
              <div className="space-y-3">
                <div>
                  <p className="font-bold text-slate-900">{resume.project1Title || 'Project title not added'}</p>
                  <p className="mt-1 text-slate-700 leading-7 whitespace-pre-line">{resume.project1Description || 'Project description not added'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{resume.project2Title || 'Project title not added'}</p>
                  <p className="mt-1 text-slate-700 leading-7 whitespace-pre-line">{resume.project2Description || 'Project description not added'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50/70 px-6 py-6 md:px-8 md:py-8 space-y-6 border-t md:border-t-0 md:border-l border-slate-200">
            <div>
              <p className="font-bold text-slate-900 mb-2">Core Skills</p>
              <div className="flex flex-wrap gap-2">
                {skillList.length > 0 ? skillList.map((skill) => (
                  <span key={skill} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800">{skill}</span>
                )) : <p className="text-sm text-slate-500">Not added</p>}
              </div>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-2">Education</p>
              <p className="text-slate-700 leading-7 whitespace-pre-line">{resume.education || 'Not added'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-2">Achievements</p>
              <p className="text-slate-700 leading-7 whitespace-pre-line">{resume.achievements || 'Not added'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PremiumPlusResumeReviews = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reviews, setReviews] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [studentNote, setStudentNote] = useState('');
  const [selectedSource, setSelectedSource] = useState('builder');
  const [resumeFile, setResumeFile] = useState(null);
  const [showBuilderPreview, setShowBuilderPreview] = useState(false);
  const [profileReviews, setProfileReviews] = useState([]);
  const [profileReviewForm, setProfileReviewForm] = useState({ review_type: 'linkedin', url: '', student_note: '' });
  const [profileFeedbackDrafts, setProfileFeedbackDrafts] = useState({});

  const cycleMonth = getCareerCycleMonth();
  const builderResume = useMemo(() => readBuilderResume(profile, user), [profile, user]);
  const staff = isCareerStaff(profile);
  const allowed = canUseCareerSupport(profile);

  const loadReviews = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    try {
      let query = supabase.from('career_resume_reviews').select('*').order('created_at', { ascending: false });
      if (profile.role === 'student') query = query.eq('student_id', profile.id);
      if (profile.role === 'teacher') query = query.eq('teacher_id', profile.id);
      const { data, error: reviewError } = await query;
      if (reviewError) throw reviewError;

      const rows = data || [];
      setReviews(rows);
      let profileReviewRows = [];
      let profileReviewQuery = supabase.from('career_profile_reviews').select('*').order('created_at', { ascending: false });
      if (profile.role === 'student') profileReviewQuery = profileReviewQuery.eq('student_id', profile.id);
      if (profile.role === 'teacher') profileReviewQuery = profileReviewQuery.eq('teacher_id', profile.id);
      const { data: profileReviewData, error: profileReviewError } = await profileReviewQuery;
      if (profileReviewError) throw profileReviewError;
      profileReviewRows = profileReviewData || [];
      setProfileReviews(profileReviewRows);

      const profileIds = Array.from(new Set([
        ...rows.flatMap((row) => [row.student_id, row.teacher_id]),
        ...profileReviewRows.flatMap((row) => [row.student_id, row.teacher_id]),
      ].filter(Boolean)));
      if (profileIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('id', profileIds);
        if (profileError) throw profileError;
        setProfilesById(Object.fromEntries((profileRows || []).map((row) => [row.id, row])));
      } else {
        setProfilesById({});
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to load resume reviews. Apply the career support SQL setup if this is the first run.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [profile?.id, profile?.role]);

  const currentCycleReviews = useMemo(
    () => reviews.filter((row) => row.student_id === profile?.id && row.cycle_month === cycleMonth),
    [reviews, profile?.id, cycleMonth]
  );
  const usedThisCycle = currentCycleReviews.length;
  const userLimit = profile?.resume_review_limit != null
    ? (profile.resume_review_limit === -1 ? Infinity : profile.resume_review_limit)
    : RESUME_REVIEW_LIMIT;
  const remaining = userLimit === Infinity ? Infinity : Math.max(userLimit - usedThisCycle, 0);
  const builderAts = useMemo(() => scoreResume(builderResume || {}), [builderResume]);
  const visibleReviews = useMemo(() => reviews, [reviews]);
  const visibleProfileReviews = useMemo(() => profileReviews, [profileReviews]);

  const uploadResumeFile = async (reviewId) => {
    if (!resumeFile) return {};
    const extension = resumeFile.name.split('.').pop() || 'pdf';
    const path = `resume-reviews/${profile.id}/${reviewId}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('career-support').upload(path, resumeFile, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('career-support').getPublicUrl(path);
    return { file_name: resumeFile.name, file_url: data?.publicUrl || '' };
  };

  const submitReview = async () => {
    if (!allowed || staff || remaining <= 0 || saving) return;
    if (selectedSource === 'builder' && !builderResume) {
      setError('Please create your resume in Resume Builder first, or choose Upload Another Resume.');
      return;
    }
    if (selectedSource === 'upload' && !resumeFile) {
      setError('Please choose a resume file to upload.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const resumeData = selectedSource === 'builder' ? builderResume : {};
      const atsDetails = selectedSource === 'builder' ? scoreResume(resumeData || {}) : null;

      let aiFeedback = null;
      if (selectedSource === 'builder') {
        const fullName = profile?.full_name || user?.email?.split('@')[0] || '';
        const resumeText = formatResumeForAI(resumeData, fullName);
        const aiRes = await fetch('/api/ai-resume-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.id,
            resumeText,
            resume: resumeData,
            studentNote: studentNote.trim() || null,
          }),
        });
        const aiBody = await aiRes.json();
        if (!aiRes.ok) throw new Error(aiBody.error || 'AI review failed, please try again.');
        aiFeedback = aiBody.feedback;
      }

      const payload = {
        student_id: profile.id,
        cycle_month: cycleMonth,
        source_type: selectedSource,
        resume_snapshot: resumeData,
        ats_score: atsDetails?.score ?? null,
        ats_details: atsDetails || {},
        student_note: studentNote.trim() || null,
        status: aiFeedback ? 'reviewed' : 'pending',
        teacher_feedback: aiFeedback,
        reviewed_at: aiFeedback ? new Date().toISOString() : null,
      };
      const { data, error: insertError } = await supabase
        .from('career_resume_reviews')
        .insert(payload)
        .select('*')
        .single();
      if (insertError) throw insertError;

      let patched = data;
      if (selectedSource === 'upload' && resumeFile) {
        const filePayload = await uploadResumeFile(data.id);
        const { data: updated, error: updateError } = await supabase
          .from('career_resume_reviews')
          .update(filePayload)
          .eq('id', data.id)
          .select('*')
          .single();
        if (updateError) throw updateError;
        patched = updated;
      }

      setReviews((prev) => [patched, ...prev]);
      setStudentNote('');
      setResumeFile(null);
      setMessage(aiFeedback ? 'Resume reviewed by AI! Feedback is ready below.' : 'Resume submitted for review.');
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit resume review.');
    } finally {
      setSaving(false);
    }
  };

  const submitProfileReview = async () => {
    const url = profileReviewForm.url.trim();
    if (!allowed || staff || saving) return;
    if (!url) {
      setError('Please enter a LinkedIn, GitHub, or portfolio URL.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const teacherId = profile.assigned_teacher_id || null;
      const { data, error: insertError } = await supabase
        .from('career_profile_reviews')
        .insert({
          student_id: profile.id,
          teacher_id: teacherId,
          cycle_month: cycleMonth,
          review_type: profileReviewForm.review_type,
          url,
          student_note: profileReviewForm.student_note.trim() || null,
          status: 'pending',
        })
        .select('*')
        .single();
      if (insertError) throw insertError;
      setProfileReviews((prev) => [data, ...prev]);
      setProfileReviewForm({ review_type: 'linkedin', url: '', student_note: '' });
      setMessage('Profile review request sent to your teacher.');
      await notifyCareerTeacher({
        teacherId,
        title: 'Profile review request needs your review',
        message: `${profile.full_name || profile.email || 'A student'} submitted a ${profileReviewForm.review_type} review request. Open Resume Reviews to check the link and add feedback.`,
        source: 'profile_review',
      });
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit profile review.');
    } finally {
      setSaving(false);
    }
  };

  const saveProfileFeedback = async (review) => {
    const feedback = String(profileFeedbackDrafts[review.id] ?? review.teacher_feedback ?? '').trim();
    if (!feedback) {
      setError('Please enter feedback before completing this review.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data, error: updateError } = await supabase
        .from('career_profile_reviews')
        .update({
          teacher_feedback: feedback,
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', review.id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      setProfileReviews((prev) => prev.map((row) => (row.id === review.id ? data : row)));
      setMessage('Profile feedback saved.');
      await sendAdminNotification({
        target_user_id: review.student_id,
        target_role: 'student',
        title: 'Profile review feedback is ready',
        content: `Your teacher reviewed your ${review.review_type} link. Open Resume Reviews to read the feedback.`,
        type: 'profile_review_ready',
      });
    } catch (saveError) {
      setError(saveError.message || 'Failed to save profile feedback.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading resume reviews..." />;

  if (!allowed) {
    return (
      <PremiumPlusUpgradeGate
        profile={profile}
        title="Unlock Resume Reviews"
        message="Resume reviews are available with Premium Plus. Upgrade to submit 1 AI-reviewed resume every calendar month."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-slate-950 p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Premium Plus</p>
        <h1 className="mt-2 text-3xl font-bold">Resume Reviews</h1>
        <p className="mt-2 max-w-3xl text-slate-300">
          Students get 1 AI-powered resume review every calendar month.
        </p>
      </section>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      {!staff ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{formatCareerCycle(cycleMonth)} Cycle</h2>
              <p className="mt-1 text-sm text-slate-500">{userLimit === Infinity ? `${usedThisCycle} reviews used (unlimited)` : `${usedThisCycle} of ${userLimit} reviews used. ${remaining} remaining.`}</p>
            </div>
            <span className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">{remaining} available</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedSource('builder')}
              className={`rounded-xl border p-4 text-left ${selectedSource === 'builder' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              <FileText />
              <p className="mt-3 font-bold">Use Resume Builder</p>
              <p className="mt-1 text-sm opacity-80">Submit the resume already saved inside SucessKart.</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('upload')}
              className={`rounded-xl border p-4 text-left ${selectedSource === 'upload' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              <Upload />
              <p className="mt-3 font-bold">Upload Another Resume</p>
              <p className="mt-1 text-sm opacity-80">Upload a PDF or document from your device.</p>
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {selectedSource === 'builder' ? (
              <div>
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Resume ATS Score</p>
                      <p className="mt-1 text-sm text-emerald-800">
                        {builderAts.missing.length
                          ? `Improve: ${builderAts.missing.join(', ')}`
                          : 'Your resume has all key sections for review.'}
                      </p>
                    </div>
                    <span className="rounded-lg bg-white px-4 py-2 text-2xl font-bold text-emerald-700">{builderAts.score}/100</span>
                  </div>
                </div>
                <button type="button" onClick={() => setShowBuilderPreview((prev) => !prev)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Eye size={16} /> {showBuilderPreview ? 'Hide' : 'View'} Builder Resume
                </button>
                {showBuilderPreview ? <div className="mt-3"><ResumePreview resume={builderResume} profile={profile} user={user} /></div> : null}
              </div>
            ) : (
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
              />
            )}
            <textarea
              value={studentNote}
              onChange={(event) => setStudentNote(event.target.value)}
              rows={4}
              placeholder="Tell your teacher what role you are targeting or what feedback you need."
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
            />
            <button
              type="button"
              onClick={submitReview}
              disabled={saving || remaining <= 0}
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {remaining <= 0 ? (userLimit === Infinity ? 'Already Submitted This Cycle' : 'Monthly Limit Used') : saving ? 'AI is reviewing your resume...' : 'Submit For AI Review'}
            </button>
          </div>
        </section>
      ) : null}

      {!staff ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">LinkedIn, GitHub, and Portfolio Review</h2>
          <p className="mt-1 text-sm text-slate-500">Submit a profile link and your teacher can review it along with your resume preparation.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr]">
            <select
              value={profileReviewForm.review_type}
              onChange={(event) => setProfileReviewForm((prev) => ({ ...prev, review_type: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-3 text-sm"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="github">GitHub</option>
              <option value="portfolio">Portfolio</option>
            </select>
            <input
              value={profileReviewForm.url}
              onChange={(event) => setProfileReviewForm((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="Paste profile or portfolio URL"
              className="rounded-xl border border-slate-300 px-3 py-3 text-sm"
            />
            <textarea
              value={profileReviewForm.student_note}
              onChange={(event) => setProfileReviewForm((prev) => ({ ...prev, student_note: event.target.value }))}
              rows={3}
              placeholder="Mention what you want your teacher to check."
              className="rounded-xl border border-slate-300 px-3 py-3 text-sm md:col-span-2"
            />
          </div>
          <button
            type="button"
            onClick={submitProfileReview}
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Submit Profile Review
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">My Review History</h2>
        <div className="mt-5 grid gap-4">
          {visibleReviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No resume reviews yet.</p>
          ) : visibleReviews.map((review) => {
            const student = profilesById[review.student_id];
            return (
              <div key={review.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{student?.full_name || student?.email || 'Resume Review'}</h3>
                    <p className="mt-1 text-sm text-slate-500">{formatCareerCycle(review.cycle_month)} • {formatDate(review.created_at)}</p>
                    <p className="mt-2 text-sm text-slate-600">{review.student_note || 'No student note added.'}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{review.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.file_url ? (
                    <a href={review.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Eye size={16} /> View Uploaded Resume
                    </a>
                  ) : null}
                  {review.resume_snapshot && Object.keys(review.resume_snapshot || {}).length ? (
                    <details className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-700">View Builder Resume</summary>
                      <div className="mt-3"><ResumePreview resume={review.resume_snapshot} profile={profilesById[review.student_id]} /></div>
                    </details>
                  ) : null}
                </div>

                {review.teacher_feedback ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-bold flex items-center gap-2"><Brain size={16} /> AI Feedback</p>
                    <p className="mt-2 whitespace-pre-line">{review.teacher_feedback}</p>
                  </div>
                ) : (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                    <Sparkles size={16} /> AI review in progress...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Profile Reviews</h2>
        <div className="mt-5 grid gap-4">
          {visibleProfileReviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No profile reviews found.</p>
          ) : visibleProfileReviews.map((review) => {
            const student = profilesById[review.student_id];
            return (
              <div key={review.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{student?.full_name || student?.email || String(review.review_type).toUpperCase()}</h3>
                    <p className="mt-1 text-sm text-slate-500">{String(review.review_type).toUpperCase()} • {formatDate(review.created_at)}</p>
                    <a href={review.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:underline">{review.url}</a>
                    <p className="mt-2 text-sm text-slate-600">{review.student_note || 'No student note added.'}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{review.status}</span>
                </div>
                {staff ? (
                  <div className="mt-4">
                    <textarea
                      value={profileFeedbackDrafts[review.id] ?? review.teacher_feedback ?? ''}
                      onChange={(event) => setProfileFeedbackDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))}
                      rows={4}
                      placeholder="Write feedback for this profile."
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => saveProfileFeedback(review)}
                      disabled={saving}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> Save Profile Feedback
                    </button>
                  </div>
                ) : review.teacher_feedback ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-bold">Teacher Feedback</p>
                    <p className="mt-2 whitespace-pre-line">{review.teacher_feedback}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default PremiumPlusResumeReviews;
