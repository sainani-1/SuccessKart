import React, { useState, useEffect } from 'react';
import { X, Wrench, Clock } from 'lucide-react';

const DISMISS_KEY_PREFIX = 'maintenance_toast_dismissed';

const MaintenanceToast = ({ enabled, message, startDate, endDate }) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDismissed(false);
      return;
    }
    const storageKey = `${DISMISS_KEY_PREFIX}_${startDate || ''}_${endDate || ''}`;
    const wasDismissed = localStorage.getItem(storageKey);
    if (wasDismissed === 'true') {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [enabled, startDate, endDate]);

  const handleDismiss = () => {
    const storageKey = `${DISMISS_KEY_PREFIX}_${startDate || ''}_${endDate || ''}`;
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  if (!enabled || dismissed) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-xl">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-2xl border border-orange-400/50 overflow-hidden animate-fade-in">
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <Wrench size={18} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Scheduled Maintenance</p>
              <p className="text-sm text-orange-100 mt-1 leading-relaxed">
                {message || 'We have scheduled maintenance coming up. The platform may be temporarily unavailable.'}
              </p>
              {startDate && endDate && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-100">
                  <Clock size={12} />
                  <span>{formatDate(startDate)} — {formatDate(endDate)}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 ml-2 w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceToast;
