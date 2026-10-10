import { getPremiumPlanType } from './premium';

export const PLAN_LEVELS = {
  free: 0,
  premium: 1,
  premium_plus: 2,
  personalized: 3,
};

export const PLAN_LABELS = {
  free: 'Free',
  premium: 'Premium',
  premium_plus: 'Premium Plus',
  personalized: 'Personalized Learning',
};

const STAFF_ROLES = ['admin', 'teacher', 'instructor', 'verifier'];

export const FEATURE_PLANS = {
  exam_readiness: 'free',
  achievement_timeline: 'free',
  verify_certificate: 'free',
  profile: 'free',
  my_certificates: 'free',
  demo_sessions: 'free',
  premium_membership: 'free',
  portfolio: 'free',
  report_issue: 'free',
  project_showcase_view: 'free',

  courses: 'premium',
  daily_planner: 'premium',
  know_your_level: 'premium',
  resume_builder: 'premium',
  company_exams: 'premium',
  coding_playground: 'premium',

  project_showcase_add: 'premium_plus',
  notes_library: 'premium_plus',
  mentorship_sessions: 'premium_plus',
  add_ons: 'premium_plus',
  write_test: 'premium_plus',
  internships: 'premium_plus',
  learn_with_ai: 'premium_plus',
  resume_reviews: 'premium_plus',
  mock_interviews: 'premium_plus',
  personal_roadmap: 'premium_plus',
  career_roadmap: 'premium_plus',
  career_support: 'premium_plus',
  premium_plus_access: 'premium_plus',

  daily_coding_streak: 'personalized',
  coding_profiles: 'personalized',
  live_classes: 'personalized',
  skill_up: 'personalized',
  discussion_forum: 'personalized',
  attendance: 'personalized',
  ask_a_doubt: 'personalized',
};

export const getUserTier = (profile) => {
  if (!profile) return 'free';
  if (profile.role && STAFF_ROLES.includes(profile.role)) return 'personalized';
  return getPremiumPlanType(profile);
};

export const getRequiredPlan = (feature) => FEATURE_PLANS[feature] || 'free';

export const getPlanLevel = (tier) => PLAN_LEVELS[tier] ?? 0;

export const canUseFeature = (profile, feature) => {
  if (!feature) return true;
  const required = FEATURE_PLANS[feature];
  if (!required) return true;
  const userTier = getUserTier(profile);
  if (userTier === 'personalized') return true;
  return getPlanLevel(userTier) >= getPlanLevel(required);
};

export const getFeatureAccess = (profile, feature) => {
  const required = getRequiredPlan(feature);
  const userTier = getUserTier(profile);
  const allowed = canUseFeature(profile, feature);

  if (allowed) {
    return { allowed: true, requiredTier: required, userTier };
  }

  const checkoutPlan = required;
  const ctaLabel = userTier === 'free' ? `Buy ${PLAN_LABELS[required]}` : `Upgrade to ${PLAN_LABELS[required]}`;

  return { allowed: false, requiredTier: required, userTier, checkoutPlan, ctaLabel };
};