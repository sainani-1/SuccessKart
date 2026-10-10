import React, { useEffect, useState } from 'react';
import { Flame, Trophy, Lock } from 'lucide-react';
import { BADGE_THRESHOLDS, BADGE_LABELS, fetchStreak } from '../utils/dcs';

const StreakBadges = ({ userId }) => {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    let active = true;
    if (userId) {
      fetchStreak(userId).then((data) => {
        if (active) setStreak(data);
      });
    }
    return () => {
      active = false;
    };
  }, [userId]);

  if (!userId) return null;

  const earned = new Set(streak?.badges || []);

  return (
    <div className="bg-white rounded-xl p-6 border">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Flame size={18} className="text-orange-500" /> Daily Coding Streak
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">
            Current:{' '}
            <span className="font-bold text-orange-600">{streak?.current_streak || 0} days</span>
          </span>
          <span className="text-slate-600">
            Best: <span className="font-bold text-blue-600">{streak?.longest_streak || 0} days</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {BADGE_THRESHOLDS.map((threshold) => {
          const isEarned = earned.has(threshold);
          return (
            <div
              key={threshold}
              className={`rounded-lg border p-2.5 text-center ${
                isEarned
                  ? 'bg-gold-50 border-gold-300'
                  : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
              title={BADGE_LABELS[threshold]}
            >
              {isEarned ? (
                <Trophy size={18} className="mx-auto text-gold-500" />
              ) : (
                <Lock size={16} className="mx-auto text-slate-400" />
              )}
              <p className="text-xs font-bold mt-1">
                {threshold === 900 ? 'Ultimate' : `${threshold}d`}
              </p>
              <p className="text-[9px] uppercase text-slate-400">
                {isEarned ? 'Earned' : 'Locked'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StreakBadges;
