import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ArrowLeft, ArrowRight, Check, LogOut, User, Phone, GraduationCap, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';
import { useAuth } from '../context/AuthContext';
import { attachPendingReferral } from '../utils/referrals';
import { updateUsernameForUser } from '../utils/usernames';
import { isProfileComplete } from '../utils/profileCompletion';
import { countryPhoneOptions, digitsOnly, formatPhone, getCountryPhoneOption, parseStoredPhone, validatePhoneNumber } from '../utils/phoneValidation';
import { logError } from '../utils/errorLogger';
import { logLoginEvent } from '../utils/loginHistory';

const streamOptions = {
  'B.Tech': ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Others'],
  '12th': ['MPC', 'BIPC', 'MBIPC', 'Others'],
  '10th': ['State', 'CBSE', 'ICSE', 'Others'],
  Intermediate: ['MPC', 'BIPC', 'MBIPC', 'Others']
};

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: User },
  { id: 'username', label: 'Username', icon: User },
  { id: 'fullName', label: 'Full Name', icon: User },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'terms', label: 'Terms', icon: FileText },
  { id: 'done', label: 'Done', icon: Check },
];

const CompleteGoogleProfile = () => {
  const { user, profile: authProfile, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [profileRole, setProfileRole] = useState('student');
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone: '',
    phoneCountry: '+91',
    educationLevel: '',
    studyStream: '',
    customStudyStream: '',
    diploma: '',
    termsAccepted: false
  });
  const [errors, setErrors] = useState({});
  const selectedPhoneCountry = useMemo(() => getCountryPhoneOption(formData.phoneCountry), [formData.phoneCountry]);

  useEffect(() => {
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState({ completeProfile: true }, '', currentUrl);
    window.history.pushState({ completeProfile: true }, '', currentUrl);

    const keepUserOnCompletion = () => {
      window.history.pushState({ completeProfile: true }, '', currentUrl);
      navigate('/complete-profile', { replace: true });
    };

    window.addEventListener('popstate', keepUserOnCompletion);
    return () => {
      window.removeEventListener('popstate', keepUserOnCompletion);
    };
  }, [navigate]);

  useEffect(() => {
    const hydrateFromSession = async () => {
      const currentUser = user || (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        navigate('/login', { replace: true });
        return;
      }
      const meta = currentUser.user_metadata || {};
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profile && isProfileComplete(profile)) {
        navigate('/app', { replace: true });
        return;
      }
      setProfileRole(profile?.role || meta.role || 'student');
      const parsedPhone = parseStoredPhone(profile?.phone || meta.phone || '');

      setFormData((prev) => ({
        ...prev,
        username: prev.username || authProfile?.username || profile?.username || '',
        fullName: prev.fullName || profile?.full_name || meta.full_name || meta.name || '',
        phoneCountry: prev.phone ? prev.phoneCountry : parsedPhone.countryCode,
        phone: prev.phone || parsedPhone.phone,
        educationLevel: prev.educationLevel || profile?.education_level || meta.education_level || '',
        studyStream: prev.studyStream || profile?.study_stream || meta.study_stream || '',
        diploma: prev.diploma || profile?.diploma_certificate || meta.diploma_certificate || '',
        termsAccepted: prev.termsAccepted || Boolean(profile?.terms_accepted || meta.terms_accepted)
      }));

      const role = profile?.role || meta.role || 'student';
      const visible = [0];
      if (!String(profile?.username || authProfile?.username || meta.username || '').trim()) visible.push(1);
      if (!String(profile?.full_name || meta.full_name || meta.name || '').trim()) visible.push(2);
      if (!String(profile?.phone || meta.phone || '').trim()) visible.push(3);
      if (role === 'student') {
        const hasEdu = String(profile?.education_level || meta.education_level || '').trim();
        const hasStream = String(profile?.study_stream || meta.study_stream || profile?.core_subject || meta.core_subject || '').trim();
        if (!hasEdu || !hasStream) visible.push(4);
      }
      if (profile?.auth_provider === 'google' || profile?.google_profile_completed === false) visible.push(5);
      visible.push(6);
      setVisibleSteps(visible);
    };
    hydrateFromSession();
  }, [user, authProfile?.username, navigate]);

  const resolvedStudyStream = useMemo(() => {
    if (formData.studyStream === 'Others') return formData.customStudyStream.trim();
    return formData.studyStream;
  }, [formData.studyStream, formData.customStudyStream]);

  const validateStep = (s) => {
    const next = {};
    switch (s) {
      case 1: // username
        if (!formData.username.trim()) next.username = 'Username is required';
        else if (formData.username.trim().length < 6) next.username = 'Username must be at least 6 characters';
        break;
      case 2: // fullName
        if (!formData.fullName.trim()) next.fullName = 'Full name is required';
        break;
      case 3: // phone
        const phoneError = validatePhoneNumber({ countryCode: formData.phoneCountry, phone: formData.phone });
        if (phoneError) next.phone = phoneError;
        break;
      case 4: // education
        if (profileRole === 'student') {
          if (!formData.educationLevel) next.educationLevel = 'Education level is required';
          if (!formData.studyStream) next.studyStream = 'Please select stream/branch';
          if (formData.studyStream === 'Others' && !formData.customStudyStream.trim()) {
            next.customStudyStream = 'Please enter your stream/branch';
          }
        }
        break;
      case 5: // terms
        if (!formData.termsAccepted) next.termsAccepted = 'You must accept Terms and Conditions';
        break;
    }
    return next;
  };

  const canProceed = (s) => Object.keys(validateStep(s)).length === 0;

  const checkPhoneUnique = async (phone) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .neq('id', user?.id || '')
      .maybeSingle();
    return !existing;
  };

  const goNext = async () => {
    if (step === 3) {
      const phoneErr = validateStep(3);
      setErrors(phoneErr);
      if (Object.keys(phoneErr).length > 0) return;
      const formattedCheckPhone = formatPhone({ countryCode: formData.phoneCountry, phone: formData.phone });
      setCheckingPhone(true);
      const isUnique = await checkPhoneUnique(formattedCheckPhone);
      setCheckingPhone(false);
      if (!isUnique) {
        setErrors({ phone: 'This phone number is already registered. Try a different number.' });
        return;
      }
      const currentIdx = visibleSteps.indexOf(step);
      setDirection('forward');
      setStep(visibleSteps[currentIdx + 1]);
      setErrors({});
      return;
    }
    const errs = validateStep(step);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const currentIdx = visibleSteps.indexOf(step);
    setDirection('forward');
    setStep(visibleSteps[currentIdx + 1]);
    setErrors({});
  };

  const goBack = () => {
    const currentIdx = visibleSteps.indexOf(step);
    setDirection('backward');
    setStep(visibleSteps[currentIdx - 1]);
    setErrors({});
  };

  const studentSteps = profileRole === 'student';
  const [visibleSteps, setVisibleSteps] = useState([0, 8]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep(8);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const { data: userResp } = await supabase.auth.getUser();
    const currentUser = userResp?.user || user;
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    const finalPhone = formatPhone({ countryCode: formData.phoneCountry, phone: formData.phone });
    const isPhoneUnique = await checkPhoneUnique(finalPhone);
    if (!isPhoneUnique) {
      setAlertModal({
        show: true,
        title: 'Phone Already Registered',
        message: 'This phone number is already in use. Please go back and try a different number.',
        type: 'error'
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role, auth_provider, education_level, study_stream, diploma_certificate, core_subject, avatar_url')
        .eq('id', currentUser.id)
        .maybeSingle();
      let avatarUrl = existingProfile?.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null;

      const formattedPhone = formatPhone({ countryCode: formData.phoneCountry, phone: formData.phone });
      const payload = {
        id: currentUser.id,
        auth_user_id: currentUser.id,
        role: existingProfile?.role || currentUser.user_metadata?.role || profileRole || 'student',
        email: currentUser.email || null,
        full_name: formData.fullName.trim(),
        phone: formattedPhone,
        education_level: profileRole === 'student' ? formData.educationLevel : existingProfile?.education_level || null,
        study_stream: profileRole === 'student' ? resolvedStudyStream : existingProfile?.study_stream || null,
        diploma_certificate: profileRole === 'student' ? (formData.diploma.trim() || null) : existingProfile?.diploma_certificate || null,
        core_subject: profileRole === 'student' ? (resolvedStudyStream || null) : existingProfile?.core_subject || null,
        avatar_url: avatarUrl,
        auth_provider: existingProfile?.auth_provider || 'google',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        google_profile_completed: false,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName.trim(),
          phone: formattedPhone,
          avatar_url: avatarUrl,
          role: payload.role,
        },
      });
      if (metadataError) throw metadataError;
      await updateUsernameForUser({ userId: currentUser.id, username: formData.username.trim() });
      const { error: completeError } = await supabase
        .from('profiles')
        .update({ google_profile_completed: true, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);
      if (completeError) throw completeError;

      try {
        await attachPendingReferral(currentUser.id, currentUser.email || null);
      } catch (referralError) {
        logError({ message: 'Referral attach failed:', source: 'CompleteGoogleProfile', details: referralError.message || referralError });
      }

      await fetchProfile(currentUser.id);
      await logLoginEvent(currentUser.id, { email: currentUser.email, full_name: null });
      navigate('/app', { replace: true });
    } catch (error) {
      setAlertModal({
        show: true,
        title: 'Profile Error',
        message: error.message || 'Could not save your profile details.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStepObj = visibleSteps.indexOf(step) >= 0 ? STEPS[step] : STEPS[visibleSteps[0]];
  const isFirst = step === visibleSteps[0];
  const isLast = step === visibleSteps[visibleSteps.length - 1];
  const currentStepIdx = visibleSteps.indexOf(step);
  const showNextCheck = !isLast && step > 0 && canProceed(step);

  const progressPercent = step === 0 ? 0 : Math.round((currentStepIdx / (visibleSteps.length - 1)) * 100);

  const renderStep = () => {
    const animClass = direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

    if (step === 0) {
      const fieldLabels = { 1: 'Username', 2: 'Full Name', 3: 'Phone', 4: 'Education', 5: 'Terms' };
      const neededFields = visibleSteps.filter((s) => s > 0 && s < 6).map((s) => fieldLabels[s]).filter(Boolean);
      return (
        <div key="welcome" className={`space-y-6 ${animClass}`}>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
              <User className="text-white" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome!</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              {neededFields.length <= 2
                ? "Almost there! Just a couple more details needed."
                : "Let's set up your profile with just a few details. You'll be done in under a minute."}
            </p>
          </div>
          {neededFields.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {neededFields.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-600">
                  <ChevronRight size={14} className="text-blue-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={goNext}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {neededFields.length <= 2 ? 'Continue' : 'Get Started'}
          </button>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div key="username" className={`space-y-4 ${animClass}`}>
          <div className="text-center mb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <User className="text-blue-600" size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Choose a Username</h3>
            <p className="text-sm text-slate-500">At least 6 characters</p>
          </div>
          <input
            autoFocus
            className={`w-full p-4 border-2 rounded-xl bg-slate-50 text-base transition-all focus:bg-white focus:border-blue-400 ${errors.username ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) => { setFormData((prev) => ({ ...prev, username: e.target.value })); setErrors((prev) => ({ ...prev, username: '' })); }}
          />
          {errors.username && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12} />{errors.username}</p>}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div key="fullName" className={`space-y-4 ${animClass}`}>
          <div className="text-center mb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <User className="text-blue-600" size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">What's Your Name?</h3>
            <p className="text-sm text-slate-500">Your full name as it appears on documents</p>
          </div>
          <input
            autoFocus
            className={`w-full p-4 border-2 rounded-xl bg-slate-50 text-base transition-all focus:bg-white focus:border-blue-400 ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
            placeholder="John Doe"
            value={formData.fullName}
            onChange={(e) => { setFormData((prev) => ({ ...prev, fullName: e.target.value })); setErrors((prev) => ({ ...prev, fullName: '' })); }}
          />
          {errors.fullName && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12} />{errors.fullName}</p>}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div key="phone" className={`space-y-4 ${animClass}`}>
          <div className="text-center mb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <Phone className="text-blue-600" size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Your Phone Number</h3>
            <p className="text-sm text-slate-500">Used for account recovery and notifications</p>
          </div>
          <div className="flex gap-2">
            <select
              className="w-36 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 text-sm font-medium focus:bg-white focus:border-blue-400 transition-all"
              value={formData.phoneCountry}
              onChange={(e) => {
                const nextCountry = getCountryPhoneOption(e.target.value);
                setFormData((prev) => ({ ...prev, phoneCountry: nextCountry.code, phone: digitsOnly(prev.phone).slice(0, nextCountry.max) }));
                setErrors((prev) => ({ ...prev, phone: '' }));
              }}
            >
              {countryPhoneOptions.map((option) => (
                <option key={`${option.code}-${option.country}`} value={option.code}>
                  {option.code} {option.country}
                </option>
              ))}
            </select>
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              className={`flex-1 p-4 border-2 rounded-xl bg-slate-50 text-base transition-all focus:bg-white focus:border-blue-400 ${errors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
              placeholder={`${selectedPhoneCountry.max} digit number`}
              value={formData.phone}
              onChange={(e) => { setFormData((prev) => ({ ...prev, phone: digitsOnly(e.target.value).slice(0, selectedPhoneCountry.max) })); setErrors((prev) => ({ ...prev, phone: '' })); }}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12} />{errors.phone}</p>}
        </div>
      );
    }

    if (step === 4 && studentSteps) {
      return (
        <div key="education" className={`space-y-4 ${animClass}`}>
          <div className="text-center mb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <GraduationCap className="text-blue-600" size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Education Details</h3>
            <p className="text-sm text-slate-500">Tell us about your education</p>
          </div>
          <select
            className={`w-full p-4 border-2 rounded-xl bg-slate-50 text-base transition-all focus:bg-white focus:border-blue-400 ${errors.educationLevel ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
            value={formData.educationLevel}
            onChange={(e) => { setFormData((prev) => ({ ...prev, educationLevel: e.target.value, studyStream: '', customStudyStream: '' })); setErrors((prev) => ({ ...prev, educationLevel: '' })); }}
          >
            <option value="">Select education level</option>
            <option value="B.Tech">B.Tech</option>
            <option value="12th">12th Grade</option>
            <option value="10th">10th Grade</option>
            <option value="Intermediate">Intermediate</option>
          </select>
          {errors.educationLevel && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12} />{errors.educationLevel}</p>}

          {formData.educationLevel && (
            <>
              <select
                className={`w-full p-4 border-2 rounded-xl bg-slate-50 text-base transition-all focus:bg-white focus:border-blue-400 ${errors.studyStream ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                value={formData.studyStream}
                onChange={(e) => { setFormData((prev) => ({ ...prev, studyStream: e.target.value, customStudyStream: e.target.value === 'Others' ? prev.customStudyStream : '' })); setErrors((prev) => ({ ...prev, studyStream: '' })); }}
              >
                <option value="">Select {formData.educationLevel === 'B.Tech' ? 'branch' : 'stream'}</option>
                {streamOptions[formData.educationLevel]?.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.studyStream && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12} />{errors.studyStream}</p>}
            </>
          )}

          {formData.studyStream === 'Others' && (
            <>
              <input
                className={`w-full p-4 border-2 rounded-xl bg-slate-50 text-base transition-all focus:bg-white focus:border-blue-400 ${errors.customStudyStream ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                placeholder="Enter your stream/branch"
                value={formData.customStudyStream}
                onChange={(e) => { setFormData((prev) => ({ ...prev, customStudyStream: e.target.value })); setErrors((prev) => ({ ...prev, customStudyStream: '' })); }}
              />
              {errors.customStudyStream && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12} />{errors.customStudyStream}</p>}
            </>
          )}

          {formData.educationLevel === '12th' && (
            <textarea
              className="w-full p-4 border-2 border-slate-200 rounded-xl bg-slate-50 resize-none focus:bg-white focus:border-blue-400 transition-all"
              placeholder="Diploma / Board details (optional)"
              rows={3}
              value={formData.diploma}
              onChange={(e) => setFormData((prev) => ({ ...prev, diploma: e.target.value }))}
            />
          )}
        </div>
      );
    }

    if (step === 4 && !studentSteps) {
      return null;
    }

    if (step === 5) {
      return (
        <div key="terms" className={`space-y-4 ${animClass}`}>
          <div className="text-center mb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <FileText className="text-blue-600" size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Terms & Conditions</h3>
            <p className="text-sm text-slate-500">Please agree to continue</p>
          </div>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 leading-relaxed max-h-44 overflow-y-auto">
            By creating an account, you agree to our{' '}
            <Link to="/terms-and-conditions" target="_blank" className="text-blue-600 font-semibold underline">Terms and Conditions</Link>.
            Your data is handled securely and will never be shared without your consent.
          </div>
          <label className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition-all">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={formData.termsAccepted}
              onChange={(e) => { setFormData((prev) => ({ ...prev, termsAccepted: e.target.checked })); setErrors((prev) => ({ ...prev, termsAccepted: '' })); }}
            />
            <span className="text-sm font-medium text-slate-700">
              I agree to the <Link to="/terms-and-conditions" target="_blank" className="text-blue-600 underline">Terms and Conditions</Link>
            </span>
          </label>
          {errors.termsAccepted && <p className="text-red-500 text-xs flex items-center gap-1"><X size={12} />{errors.termsAccepted}</p>}
        </div>
      );
    }

    if (step === 6) {
      return (
        <div key="done" className={`space-y-5 ${animClass}`}>
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg mb-3">
              <Check className="text-white" size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">All Set!</h3>
            <p className="text-sm text-slate-500 mt-1">Review your details before finishing</p>
          </div>

          <div className="space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
            {formData.username && <DetailRow label="Username" value={formData.username} />}
            {formData.fullName && <DetailRow label="Name" value={formData.fullName} />}
            {formData.phone && <DetailRow label="Phone" value={`${formData.phoneCountry} ${formData.phone}`} />}
            {formData.educationLevel && <DetailRow label="Education" value={`${formData.educationLevel}${formData.studyStream ? ' - ' + (formData.studyStream === 'Others' ? formData.customStudyStream : formData.studyStream) : ''}`} />}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Create Profile'}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200/60 relative">

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
          title="Logout"
        >
          <LogOut size={15} />
          Logout
        </button>

        {/* Logo / Brand */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <User className="text-white" size={16} />
          </div>
          <span className="text-sm font-bold text-slate-800">Complete Profile</span>
        </div>

        {/* Progress bar */}
        {step > 0 && !isLast && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{STEPS[step]?.label || ''}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Step content */}
        <form onSubmit={(e) => { e.preventDefault(); if (isLast) handleSubmit(e); else goNext(); }}>
          {renderStep()}

          {/* Navigation buttons (not on welcome, submit, or last review) */}
          {step > 0 && !isLast && (
            <div className="flex gap-3 mt-6">
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              <button
                type={isLast ? 'submit' : 'button'}
                onClick={isLast ? undefined : goNext}
                disabled={checkingPhone}
                className={`${currentStepIdx > 0 ? 'flex-1' : 'w-full'} py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {checkingPhone ? 'Checking...' : isLast ? 'Finish' : 'Continue'}
                {!checkingPhone && !isLast && <ArrowRight size={16} />}
              </button>
            </div>
          )}
        </form>

      </div>

      <AlertModal
        show={alertModal.show}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })}
      />

      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out; }
        .animate-slide-in-left { animation: slideInLeft 0.3s ease-out; }
      `}</style>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800 text-right max-w-[60%] truncate">{value}</span>
  </div>
);

export default CompleteGoogleProfile;
