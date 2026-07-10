import React from 'react';
import { Monitor, Laptop } from 'lucide-react';
import useIsMobileDevice from '../hooks/useIsMobileDevice';
import { useAuth } from '../context/AuthContext';

const MobileExamBlocker = ({ children, bypassRoles = [] }) => {
  const isMobile = useIsMobileDevice();
  const { profile } = useAuth();
  const role = profile?.role || 'student';

  if (!isMobile) return children;

  if (bypassRoles.includes(role)) return children;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white p-6 flex items-center justify-center relative overflow-hidden">
      <img
        src="/sucesskart-logo.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 m-auto w-72 h-72 object-contain opacity-10 mix-blend-multiply pointer-events-none select-none"
      />
      <div className="max-w-lg w-full rounded-2xl border border-red-300/30 bg-white/5 backdrop-blur-sm shadow-2xl p-10 text-center space-y-6 relative z-10">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center">
          <Monitor size={40} className="text-red-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Desktop Required
        </h1>
        <p className="text-red-100 text-sm md:text-base leading-relaxed">
          Exams and test pages can only be accessed from a <span className="font-semibold text-white">desktop or laptop computer</span>.
          Mobile devices and tablets are not supported for exam-related activities.
        </p>
        <div className="rounded-xl bg-red-500/10 border border-red-300/30 p-4 space-y-2">
          <p className="text-xs text-red-200 font-medium uppercase tracking-wide">Please switch to a desktop device</p>
          <div className="flex items-center justify-center gap-3 text-red-100">
            <Laptop size={18} />
            <span className="text-sm">Use a computer with a screen width of 1024px or more</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center rounded-xl border border-red-200/40 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default MobileExamBlocker;
