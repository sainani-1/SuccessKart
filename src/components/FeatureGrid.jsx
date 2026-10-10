import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, User, GraduationCap, Video, Users, CheckSquare,
  FileBadge, ShieldCheck, ClipboardList, Sparkles, MessageCircle, Calendar,
  Award, UserPlus, Bell, Clock, Briefcase, Settings, Gift, Mail, FileText,
  Wrench, BarChart3, Code2, MessageSquare, KeyRound, MonitorUp, ShieldAlert,
  CreditCard, Download, ListChecks, Globe2, Trophy, Wifi, QrCode, Eye, Brain,
  Mic, HelpCircle, Package, Sliders, Activity, ShieldOff, FlaskConical, Gamepad2,
  Bot, ScanFace, Building2, Compass, PenTool, X, Search, ChevronRight, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canUseFeature, getFeatureAccess, PLAN_LABELS } from '../utils/featureAccess';
import { buildPlanCheckoutPath } from '../utils/planCheckout';
import useFaceRegistrationHidden from '../hooks/useFaceRegistrationHidden';

const STUDENT_ROUTE_FEATURES = {
  '/app/courses': 'courses',
  '/app/notes-library': 'notes_library',
  '/app/daily-planner': 'daily_planner',
  '/app/daily-coding-streak': 'daily_coding_streak',
  '/app/coding-accounts': 'coding_profiles',
  '/app/write-test': 'write_test',
  '/app/class-schedule': 'live_classes',
  '/app/internships': 'internships',
  '/app/learn-with-ai': 'learn_with_ai',
  '/app/know-your-level': 'know_your_level',
  '/app/resume-builder': 'resume_builder',
  '/app/career-support': 'career_support',
  '/app/resume-reviews': 'resume_reviews',
  '/app/mock-interviews': 'mock_interviews',
  '/app/personal-roadmap': 'personal_roadmap',
  '/app/career-roadmap': 'career_roadmap',
  '/app/skill-up': 'skill_up',
  '/app/company-exam': 'company_exams',
  '/app/coding-playground': 'coding_playground',
  '/app/discussion-forum': 'discussion_forum',
  '/app/addons': 'add_ons',
  '/app/attendance': 'attendance',
  '/app/chat': 'ask_a_doubt',
  '/app/guidance-sessions': 'mentorship_sessions',
};

const getNavItems = (role, { isPremium, isPremiumPlus, ahiAuthorized, vmiAccess, unreadChats, unreadNotifications, profile, hideFace }) => {
  const common = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, category: 'Quick Access' },
    { to: '/app/design', label: 'Design', icon: PenTool, category: 'Quick Access' },
    { to: '/app/profile', label: 'Profile', icon: User, category: 'Account' },
    { to: '/app/settings', label: 'Settings', icon: Settings, category: 'Account' },
    { to: '/app/notifications', label: 'Notifications', icon: Bell, category: 'Account', badge: unreadNotifications },
    { to: '/app/courses', label: 'Courses', icon: BookOpen, category: 'Learning' },
    { to: '/app/notes-library', label: 'Notes Library', icon: FileText, category: 'Learning' },
    { to: '/app/verify', label: 'Verify Certificate', icon: ShieldCheck, category: 'Certificates' },
  ];

  const instructor = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, category: 'Quick Access' },
    { to: '/app/design', label: 'Design', icon: PenTool, category: 'Quick Access' },
    { to: '/app/instructor/all-in-one', label: 'All In One', icon: MonitorUp, category: 'Teaching' },
    { to: '/app/instructor/live-exams', label: 'Live Exams', icon: ShieldCheck, category: 'Exams' },
    { to: '/app/profile', label: 'Profile', icon: User, category: 'Account' },
    { to: '/app/settings', label: 'Settings', icon: Settings, category: 'Account' },
  ];

  const verifier = [
    { to: '/app/verifier', label: 'Dashboard', icon: LayoutDashboard, category: 'Quick Access' },
    { to: '/app/design', label: 'Design', icon: PenTool, category: 'Quick Access' },
    { to: '/app/verifier/id-verifications', label: 'ID Verifications', icon: ShieldCheck, category: 'Verification' },
    { to: '/app/notifications', label: 'Notifications', icon: Bell, category: 'Account', badge: unreadNotifications },
    { to: '/app/profile', label: 'Profile', icon: User, category: 'Account' },
    { to: '/app/settings', label: 'Settings', icon: Settings, category: 'Account' },
  ];

  const student = [
    ...common,
    { to: '/app/daily-planner', label: 'Daily Planner', icon: Calendar, category: 'Learning' },
    { to: '/app/course-checklist', label: 'Course Checklist', icon: ClipboardList, category: 'Learning' },
    { to: '/app/exam-readiness', label: 'Exam Readiness', icon: CheckSquare, category: 'Learning' },
    { to: '/app/achievement-timeline', label: 'Achievement Timeline', icon: Sparkles, category: 'Learning' },
    { to: '/app/my-exams', label: 'My Exams', icon: Calendar, category: 'Exams' },
    { to: '/app/write-test', label: 'Write Test', icon: CheckSquare, category: 'Exams' },
    { to: '/app/my-certificates', label: 'My Certificates', icon: GraduationCap, category: 'Certificates' },
    { to: '/app/verify-my-id', label: 'Verify My ID', icon: ShieldCheck, category: 'Certificates' },
    { to: '/app/class-schedule', label: 'Live Classes', icon: Video, category: 'Live' },
    { to: '/app/demo-sessions', label: 'Demo Sessions', icon: Video, category: 'Live' },
    { to: '/app/premium-status', label: 'Premium Membership', icon: Award, category: 'Account' },
    { to: '/app/question-bank', label: 'Question Bank', icon: HelpCircle, category: 'Learning' },
    { to: '/app/offers', label: 'Discounts & Offers', icon: Gift, category: 'Account' },
    { to: '/app/internships', label: 'Internships', icon: Briefcase, category: 'Career' },
    { to: '/app/project-showcase', label: 'Project Showcase', icon: Trophy, category: 'Career' },
    { to: '/app/learn-with-ai', label: 'Learn with AI', icon: Brain, category: 'AI Tools' },
    { to: '/app/know-your-level', label: 'Know Your Level', icon: Brain, category: 'AI Tools' },
    ...(vmiAccess?.ai_prep_enabled ? [{ to: '/app/ai-prep', label: 'AI Prep', icon: Sparkles, category: 'AI Tools' }] : []),
    ...(vmiAccess?.talk_mock_enabled ? [{ to: '/app/talk-mock-interviews', label: 'Talk Mock Interviews', icon: Mic, category: 'AI Tools' }] : []),
    { to: '/app/resume-builder', label: 'Resume Builder', icon: FileText, category: 'Career' },
    { to: '/app/portfolio', label: 'Portfolio', icon: Globe2, category: 'Career' },
    { to: '/app/career-support', label: 'Career Support', icon: BarChart3, category: 'Career' },
    { to: '/app/career-support#career-report', label: 'Career Report PDF', icon: Download, category: 'Career' },
    { to: '/app/career-support#career-tasks', label: 'Career Tasks', icon: ListChecks, category: 'Career' },
    { to: '/app/career-support#interview-practice', label: 'Interview Practice', icon: MessageSquare, category: 'Career' },
    { to: '/app/career-support#career-history', label: 'Career History', icon: Clock, category: 'Career' },
    { to: '/app/resume-reviews', label: 'Resume Reviews', icon: FileText, category: 'Career' },
    { to: '/app/mock-interviews', label: 'Mock Interviews', icon: MessageSquare, category: 'Career' },
    { to: '/app/personal-roadmap', label: 'Personal Roadmap', icon: Sparkles, category: 'Career' },
    { to: '/app/career-roadmap', label: 'AI Career Roadmap', icon: Compass, category: 'Career' },
    { to: '/app/skill-up', label: 'SkillUp Yourself', icon: Trophy, category: 'Career' },
    { to: '/app/company-exam', label: 'Company Exams', icon: Building2, category: 'Exams' },
    { to: '/app/coding-playground', label: 'Coding Playground', icon: Code2, category: 'AI Tools' },
    { to: '/app/discussion-forum', label: 'Discussion Forum', icon: MessageSquare, category: 'Community' },
    { to: '/app/addons', label: 'Add Ons', icon: Package, category: 'Account' },
    { to: '/app/attendance', label: 'Attendance', icon: ClipboardList, category: 'Account' },
    { to: '/app/chat', label: 'Ask a Doubt', icon: MessageCircle, category: 'Community', badge: unreadChats },
    { to: '/app/request-teacher', label: 'Request Teacher', icon: UserPlus, category: 'Community' },
    { to: '/app/report-issue', label: 'Report Issue', icon: Wrench, category: 'Account' },
    { to: '/app/assignments', label: 'Assignments', icon: ClipboardList, category: 'Learning' },
    ...(!isPremium ? [{ to: '/app/payment', label: 'Buy Premium', icon: CreditCard, category: 'Account' }] : []),
    ...(isPremium && !isPremiumPlus ? [{ to: '/app/payment', label: 'Upgrade Premium Plus', icon: CreditCard, category: 'Account' }] : []),
    ...(ahiAuthorized ? [{ to: '/ahi-interview', label: 'AHI', icon: Bot, category: 'AI Tools' }] : []),
    ...(hideFace ? [] : [{ to: '/app/face-register', label: 'Register Face', icon: ScanFace, category: 'Account' }]),
  ];

  const teacher = [
    ...common,
    { to: '/app/teacher/performance', label: 'Performance', icon: BarChart3, category: 'Teaching' },
    { to: '/app/teacher/at-risk-students', label: 'At Risk Students', icon: ShieldAlert, category: 'Teaching' },
    { to: '/app/all-in-one', label: 'All In One', icon: MonitorUp, category: 'Teaching' },
    { to: '/app/live-exams', label: 'Live Exams', icon: ShieldCheck, category: 'Exams' },
    { to: '/app/teacher/tests', label: 'Conduct Tests', icon: CheckSquare, category: 'Exams' },
    { to: '/app/teacher/assignments', label: 'Assignments', icon: ClipboardList, category: 'Teaching' },
    { to: '/app/teacher/career-queue', label: 'Career Queue', icon: BarChart3, category: 'Career' },
    { to: '/app/resume-reviews', label: 'Resume Reviews', icon: FileText, category: 'Career' },
    { to: '/app/mock-interviews', label: 'Mock Interviews', icon: MessageSquare, category: 'Career' },
    { to: '/app/personal-roadmap', label: 'Personal Roadmap', icon: Sparkles, category: 'Career' },
    { to: '/app/internships', label: 'Internships', icon: Briefcase, category: 'Career' },
    { to: '/app/clear-doubts', label: 'Clear Doubts', icon: MessageCircle, category: 'Community', badge: unreadChats },
    { to: '/app/attendance', label: 'Attendance', icon: CheckSquare, category: 'Account' },
    { to: '/app/my-students', label: 'My Students', icon: Users, category: 'Teaching' },
    { to: '/app/assigned-classes', label: 'Assigned Classes', icon: Video, category: 'Live' },
    { to: '/app/teacher/record-class', label: 'Record Class', icon: Video, category: 'Live' },
    { to: '/app/class-feedback', label: 'Class Feedback', icon: MessageSquare, category: 'Live' },
    { to: '/app/class-schedule', label: 'Schedule Sessions', icon: Calendar, category: 'Live' },
    { to: '/app/demo-sessions', label: 'Demo Sessions', icon: Video, category: 'Live' },
    { to: '/app/leaves', label: 'Apply Leave', icon: Calendar, category: 'Account' },
    { to: '/app/session-reassignments', label: 'Session Reassignments', icon: Users, category: 'Teaching' },
    { to: '/app/teacher-requests', label: 'Student Requests', icon: UserPlus, category: 'Teaching' },
    { to: '/app/report-issue', label: 'Report Issue', icon: Wrench, category: 'Account' },
    ...(hideFace ? [] : [{ to: '/app/face-register', label: 'Register Face', icon: ScanFace, category: 'Account' }]),
  ];

  const admin = [
    ...common,
    { to: '/app/admin/at-risk-students', label: 'At Risk Students', icon: ShieldAlert, category: 'Monitoring' },
    { to: '/app/admin/security-review', label: 'Security Review', icon: ShieldCheck, category: 'Monitoring' },
    { to: '/app/admin/online', label: 'Online', icon: Wifi, category: 'Monitoring' },
    { to: '/app/admin/visitors', label: 'Visiting Website', icon: Eye, category: 'Monitoring' },
    { to: '/app/all-in-one', label: 'All In One', icon: MonitorUp, category: 'Teaching' },
    { to: '/app/live-exams', label: 'Live Exams', icon: ShieldCheck, category: 'Exams' },
    { to: '/app/live-exam-slots', label: 'Exam Slots', icon: Calendar, category: 'Exams' },
    { to: '/app/live-monitoring', label: 'Live Monitoring', icon: Video, category: 'Exams' },
    { to: '/app/live-attendance', label: 'Exam Attendance', icon: ClipboardList, category: 'Exams' },
    { to: '/app/faculty-attendance', label: 'Faculty Attendance', icon: Users, category: 'Exams' },
    { to: '/app/live-alerts', label: 'Violation Alerts', icon: Bell, category: 'Exams' },
    { to: '/app/live-messages', label: 'Exam Messages', icon: MessageSquare, category: 'Exams' },
    { to: '/app/admin/logic-building-setup', label: 'Logic Building Setup', icon: Sparkles, category: 'Learning' },
    { to: '/app/admin/logic-building-admin-scoreboard', label: 'Admin Scoreboard', icon: Award, category: 'Learning' },
    { to: '/app/admin/change-course', label: 'Change Course', icon: BookOpen, category: 'Learning' },
    { to: '/app/admin/grant-skillup', label: 'Grant SkillUp', icon: UserPlus, category: 'Admin' },
    { to: '/app/admin/send-gift', label: 'Send Gift', icon: Gift, category: 'Admin' },
    { to: '/app/admin/active-coupons', label: 'Active Coupons', icon: Gift, category: 'Admin' },
    { to: '/app/admin/user-management', label: 'User Management', icon: Users, category: 'Admin' },
    { to: '/app/admin/tried-to-register', label: 'Tried to Register', icon: UserPlus, category: 'Admin' },
    { to: '/app/admin/user-tools', label: 'Add/Remove', icon: UserPlus, category: 'Admin' },
    { to: '/app/admin/usernames', label: 'Usernames', icon: User, category: 'Admin' },
    { to: '/app/admin/certificate-blocks', label: 'Certificate Blocks', icon: Award, category: 'Admin' },
    { to: '/app/admin/prize-certificates', label: 'Prizes & Certificates', icon: FileBadge, category: 'Admin' },
    { to: '/app/admin/user-ids', label: 'User IDs', icon: User, category: 'Admin' },
    { to: '/app/admin/teacher-progress', label: 'Teacher Progress', icon: Sparkles, category: 'Progress' },
    { to: '/app/admin/student-progress', label: 'Student Progress', icon: GraduationCap, category: 'Progress' },
    { to: '/app/admin/career-analytics', label: 'Career Analytics', icon: BarChart3, category: 'Career' },
    { to: '/app/admin/career-queue', label: 'Career Queue', icon: ListChecks, category: 'Career' },
    { to: '/app/resume-reviews', label: 'Resume Reviews', icon: FileText, category: 'Career' },
    { to: '/app/mock-interviews', label: 'Mock Interviews', icon: MessageSquare, category: 'Career' },
    { to: '/app/personal-roadmap', label: 'Personal Roadmap', icon: Sparkles, category: 'Career' },
    { to: '/app/class-schedule', label: 'Schedule Live Classes', icon: Video, category: 'Live' },
    { to: '/app/class-feedback', label: 'Class Feedback', icon: MessageSquare, category: 'Live' },
    { to: '/app/admin/manage-premium', label: 'Manage Premium', icon: Award, category: 'Admin' },
    { to: '/app/admin/plans', label: 'Plan Management', icon: CreditCard, category: 'Admin' },
    { to: '/app/admin/addons', label: 'Add-Ons Management', icon: Package, category: 'Admin' },
    { to: '/app/admin/ai-settings', label: 'AI Settings', icon: Brain, category: 'AI Tools' },
    { to: '/app/admin/ai-basic-limit', label: 'AI Basic Limit', icon: Sliders, category: 'AI Tools' },
    { to: '/app/admin/ai-limit-increaser', label: 'AI Limit Increaser', icon: BarChart3, category: 'AI Tools' },
    { to: '/app/admin/mfa-setup', label: 'MFA Setup', icon: KeyRound, category: 'Security' },
    { to: '/app/admin/activity-logs', label: 'Activity Logs', icon: Activity, category: 'Monitoring' },
    { to: '/app/admin/admin-chat', label: 'Admin Chat', icon: MessageCircle, category: 'Community' },
    { to: '/app/admin/send-notification', label: 'Send Notification', icon: Mail, category: 'Admin' },
    { to: '/app/admin/push-notifications', label: 'Push Notifications', icon: Bell, category: 'Admin' },
    { to: '/app/admin/maintenance', label: 'Maintenance Mode', icon: ShieldOff, category: 'Admin' },
    { to: '/app/admin/hide-face', label: 'Hide Face', icon: ScanFace, category: 'Admin' },
    { to: '/app/admin/demo-sessions', label: 'Demo Sessions', icon: Video, category: 'Live' },
    { to: '/app/admin/exam-settings', label: 'Exam Settings', icon: FlaskConical, category: 'Exams' },
    { to: '/app/admin/exam-overrides', label: 'Exam Overrides', icon: Sliders, category: 'Exams' },
    { to: '/app/admin/exam-retakes', label: 'Exam Retakes', icon: ClipboardList, category: 'Exams' },
    { to: '/app/admin/vmi-settings', label: 'VMI Settings', icon: Settings, category: 'AI Tools' },
    { to: '/app/admin/career-guidance', label: 'Career Guidance', icon: Compass, category: 'Career' },
    { to: '/app/admin/startup-ideas', label: 'Startup Ideas', icon: Sparkles, category: 'Career' },
    { to: '/app/attendance', label: 'Attendance', icon: CheckSquare, category: 'Account' },
    { to: '/app/admin/guidance-sessions', label: 'Guidance Sessions', icon: Calendar, category: 'Live' },
    { to: '/app/report-issue', label: 'Report Issue', icon: Wrench, category: 'Account' },
    ...(hideFace ? [] : [{ to: '/app/face-register', label: 'Register Face', icon: ScanFace, category: 'Account' }]),
  ];

  const items = role === 'instructor' ? instructor : role === 'verifier' ? verifier : role === 'teacher' ? teacher : role === 'admin' ? admin : student
    .filter((item) => {
      if (item.to === '/app/request-teacher' && profile?.assigned_teacher_id) return false;
      return true;
    });
  return items;
};

const categoryColors = {
  'Quick Access': 'from-blue-500 to-blue-600',
  'Learning': 'from-emerald-500 to-emerald-600',
  'Exams': 'from-orange-500 to-orange-600',
  'Certificates': 'from-yellow-500 to-yellow-600',
  'AI Tools': 'from-violet-500 to-violet-600',
  'Career': 'from-pink-500 to-pink-600',
  'Live': 'from-red-500 to-red-600',
  'Community': 'from-teal-500 to-teal-600',
  'Account': 'from-slate-500 to-slate-600',
  'Teaching': 'from-indigo-500 to-indigo-600',
  'Admin': 'from-amber-500 to-amber-600',
  'Monitoring': 'from-cyan-500 to-cyan-600',
  'Progress': 'from-lime-500 to-lime-600',
  'Verification': 'from-sky-500 to-sky-600',
  'Security': 'from-rose-500 to-rose-600',
};

const categoryBg = {
  'Quick Access': 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  'Learning': 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  'Exams': 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  'Certificates': 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  'AI Tools': 'bg-violet-50 border-violet-200 hover:bg-violet-100',
  'Career': 'bg-pink-50 border-pink-200 hover:bg-pink-100',
  'Live': 'bg-red-50 border-red-200 hover:bg-red-100',
  'Community': 'bg-teal-50 border-teal-200 hover:bg-teal-100',
  'Account': 'bg-slate-50 border-slate-200 hover:bg-slate-100',
  'Teaching': 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
  'Admin': 'bg-amber-50 border-amber-200 hover:bg-amber-100',
  'Monitoring': 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100',
  'Progress': 'bg-lime-50 border-lime-200 hover:bg-lime-100',
  'Verification': 'bg-sky-50 border-sky-200 hover:bg-sky-100',
  'Security': 'bg-rose-50 border-rose-200 hover:bg-rose-100',
};

const categoryIconColor = {
  'Quick Access': 'text-blue-600',
  'Learning': 'text-emerald-600',
  'Exams': 'text-orange-600',
  'Certificates': 'text-yellow-600',
  'AI Tools': 'text-violet-600',
  'Career': 'text-pink-600',
  'Live': 'text-red-600',
  'Community': 'text-teal-600',
  'Account': 'text-slate-600',
  'Teaching': 'text-indigo-600',
  'Admin': 'text-amber-600',
  'Monitoring': 'text-cyan-600',
  'Progress': 'text-lime-600',
  'Verification': 'text-sky-600',
  'Security': 'text-rose-600',
};

const FeatureGrid = ({ open, onClose }) => {
  const { profile, isPremium, isPremiumPlus } = useAuth();
  const role = profile?.role || 'student';
  const hideFace = useFaceRegistrationHidden();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [lockedPlan, setLockedPlan] = useState(null);

  const openLockedPlan = (item) => {
    const feature = STUDENT_ROUTE_FEATURES[item.to];
    if (!feature || canUseFeature(profile, feature)) {
      handleNav(item.to);
      return;
    }
    const access = getFeatureAccess(profile, feature);
    setLockedPlan({
      label: item.label,
      ctaLabel: access.ctaLabel || 'Buy Premium',
      checkoutPlan: access.checkoutPlan || 'premium',
      requiredPlan: access.requiredTier || 'premium',
    });
  };

  const items = getNavItems(role, { isPremium, isPremiumPlus, profile, hideFace });
  const filtered = search
    ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  const grouped = {};
  filtered.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  const categories = Object.keys(grouped);

  const handleNav = (to) => {
    navigate(to);
    onClose();
    setSearch('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">All Features</h1>
            <p className="text-xs text-slate-500 capitalize">{role} Panel</p>
          </div>
        </div>
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            autoFocus
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {categories.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No features found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}
        {categories.map(cat => (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className={`h-1 w-1 rounded-full bg-gradient-to-r ${categoryColors[cat] || 'from-slate-400 to-slate-500'}`} />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{cat}</h2>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">{grouped[cat].length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {grouped[cat].map((item) => {
                const Icon = item.icon;
                const feature = STUDENT_ROUTE_FEATURES[item.to];
                const locked = Boolean(feature && !canUseFeature(profile, feature));
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => openLockedPlan(item)}
                    className={`group relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 md:p-5 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${categoryBg[cat] || 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {item.badge > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                    {locked && (
                      <span className="absolute top-2 left-2 rounded-full bg-amber-100 p-1 text-amber-700" title="Premium feature">
                        <Lock size={12} />
                      </span>
                    )}
                    <div className={`p-2.5 rounded-xl bg-white shadow-sm group-hover:shadow-md transition-shadow ${categoryIconColor[cat] || 'text-slate-600'} ${locked ? 'opacity-60' : ''}`}>
                      <Icon size={22} />
                    </div>
                    <span className="text-xs md:text-sm font-semibold text-slate-700 text-center leading-tight">{item.label}</span>
                    {locked ? (
                      <ChevronRight size={12} className="absolute bottom-2 right-2 text-amber-400" />
                    ) : (
                      <ChevronRight size={12} className="absolute bottom-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {lockedPlan && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{lockedPlan.label}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  This feature is part of the {PLAN_LABELS[lockedPlan.requiredPlan] || lockedPlan.requiredPlan} plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLockedPlan(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close upgrade prompt"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  const checkoutPath = buildPlanCheckoutPath(lockedPlan.checkoutPlan);
                  setLockedPlan(null);
                  handleNav(checkoutPath);
                }}
                className="w-full rounded-xl bg-gold-400 py-3 font-bold text-slate-900 hover:bg-gold-300"
              >
                {lockedPlan.ctaLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockedPlan(null);
                  handleNav('/app/premium-status');
                }}
                className="w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                See Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureGrid;
