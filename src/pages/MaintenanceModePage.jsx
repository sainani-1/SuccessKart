import React from 'react';
import { Settings, Wrench, Clock } from 'lucide-react';

const MaintenanceModePage = ({ message, startDate, endDate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 text-white p-6 flex items-center justify-center relative overflow-hidden">
      <img
        src="/NewLogo.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 m-auto w-72 h-72 object-contain opacity-10 mix-blend-multiply pointer-events-none select-none"
      />
      <div className="max-w-xl w-full rounded-2xl border border-orange-300/30 bg-white/5 backdrop-blur-sm shadow-2xl p-8 text-center space-y-5 relative z-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/20 border border-orange-400/30">
          <Wrench size={40} className="text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-orange-300">Under Maintenance</h1>
        <p className="text-orange-100 text-base leading-relaxed">
          {message || 'We are currently undergoing scheduled maintenance. We will be back soon. Thank you for your patience!'}
        </p>
        {startDate && endDate && (
          <div className="rounded-xl bg-orange-500/10 border border-orange-300/30 p-4">
            <div className="flex items-center justify-center gap-2 text-orange-200 text-sm">
              <Clock size={16} />
              <span>
                {new Date(startDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                {' — '}
                {new Date(endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          </div>
        )}
        <p className="text-xs text-orange-300/60 mt-4">
          Please try again later or contact support if this persists.
        </p>
      </div>
    </div>
  );
};

export default MaintenanceModePage;
