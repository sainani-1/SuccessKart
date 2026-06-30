import { DIFFICULTY_LEVELS, CURRICULUM_XP, DIFFICULTY_XP } from './codingProblems';

export function getLevelFromXp(xp) {
  return Math.floor(xp / 500) + 1;
}

export function getXpForNextLevel(xp) {
  return 500 - (xp % 500);
}

export function getLevelProgress(xp) {
  return ((xp % 500) / 500) * 100;
}

export function getRankFromXp(xp) {
  if (xp >= 15000) return 'S';
  if (xp >= 10000) return 'A';
  if (xp >= 5000) return 'B';
  if (xp >= 2000) return 'C';
  if (xp >= 1000) return 'D';
  if (xp >= 500) return 'E';
  return 'F';
}

export function getUnlockedDifficulties(totalXp) {
  return DIFFICULTY_LEVELS.filter((d) => totalXp >= d.requiredScore);
}

export function isDifficultyUnlocked(difficultyName, totalXp) {
  const level = DIFFICULTY_LEVELS.find((d) => d.name === difficultyName);
  if (!level) return true;
  return totalXp >= level.requiredScore;
}

export function calculateStreak(dates) {
  if (!dates || dates.length === 0) return 0;

  const uniqueDays = [...new Set(dates.map((d) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }))].sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  let check = new Date(today);
  for (let i = 0; i < uniqueDays.length; i++) {
    const checkKey = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (uniqueDays[i] === checkKey) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else if (uniqueDays[i] === `${today.getFullYear()}-${today.getMonth()}-${today.getDate() - 1}` && i === 0 && uniqueDays[0] !== todayKey) {
      check = new Date(today);
      check.setDate(check.getDate() - 1);
      if (uniqueDays[i] === `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`) {
        streak++;
        check.setDate(check.getDate() - 1);
      }
      break;
    } else {
      break;
    }
  }

  return streak;
}

export function generateHeatmapData(submissions) {
  const data = [];
  const today = new Date();
  const countMap = {};

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    countMap[key] = 0;
  }

  if (submissions && submissions.length > 0) {
    for (const sub of submissions) {
      const d = new Date(sub.created_at || sub.date || sub.timestamp);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (countMap[key] !== undefined) {
        countMap[key]++;
      }
    }
  }

  for (const [date, count] of Object.entries(countMap)) {
    data.push({ date, count });
  }

  return data.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getHeatmapColor(count, maxCount) {
  if (count === 0) return 'bg-slate-800/60';
  const intensity = count / (maxCount || 1);
  if (intensity <= 0.25) return 'bg-emerald-900/40';
  if (intensity <= 0.5) return 'bg-emerald-700/60';
  if (intensity <= 0.75) return 'bg-emerald-500/70';
  return 'bg-emerald-400/80';
}

export function getDifficultyColor(difficulty) {
  const colors = {
    'Very Easy': 'bg-emerald-100 text-emerald-800',
    'Easy': 'bg-green-100 text-green-800',
    'Basic': 'bg-teal-100 text-teal-800',
    'Beginner': 'bg-cyan-100 text-cyan-800',
    'Intermediate': 'bg-amber-100 text-amber-800',
    'Advanced': 'bg-orange-100 text-orange-800',
    'Expert': 'bg-red-100 text-red-800',
    'Hard': 'bg-rose-100 text-rose-800',
    'Very Hard': 'bg-purple-100 text-purple-800',
    'Competitive Programming': 'bg-fuchsia-100 text-fuchsia-800',
  };
  return colors[difficulty] || 'bg-slate-100 text-slate-800';
}

export function getDifficultyBadgeColor(difficulty) {
  const colors = {
    'Very Easy': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Easy': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Basic': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'Beginner': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'Intermediate': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Advanced': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Expert': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Hard': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'Very Hard': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Competitive Programming': 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  };
  return colors[difficulty] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

export function getCurriculumXp(difficulty) {
  const d = CURRICULUM_XP[difficulty];
  return d ? d.xp : 10;
}

export function getCurriculumCoins(difficulty) {
  const d = CURRICULUM_XP[difficulty];
  return d ? d.coins : 5;
}

export function getDifficultyXp(difficultyName) {
  const d = DIFFICULTY_XP[difficultyName];
  return d ? d.xp : 10;
}

export function getDifficultyCoins(difficultyName) {
  const d = DIFFICULTY_XP[difficultyName];
  return d ? d.coins : 5;
}

export function getCategoryFromProblemId(problemId, CURRICULUM) {
  if (problemId <= 20) return 'beginner';
  for (const section of CURRICULUM) {
    if (section.problemIds && section.problemIds.includes(problemId)) {
      return section.id;
    }
  }
  const tags = ['Easy', 'Basic', 'Beginner'];
  return 'easy';
}

export function checkBadges(userProgress, allProblems) {
  const badges = [];
  const { problemsSolved, xp, currentStreak, longestStreak, solvedIds } = userProgress;

  if (problemsSolved >= 1) badges.push({ id: 'first_accepted', name: 'First Accepted Solution', icon: '🎉', unlocked: true });
  if (problemsSolved >= 10) badges.push({ id: 'ten_solved', name: '10 Problems Solved', icon: '⭐', unlocked: true });
  if (problemsSolved >= 50) badges.push({ id: 'fifty_solved', name: '50 Problems Solved', icon: '🏆', unlocked: true });
  if (problemsSolved >= 100) badges.push({ id: 'hundred_solved', name: '100 Problems Solved', icon: '👑', unlocked: true });
  if (currentStreak >= 7) badges.push({ id: 'seven_day_streak', name: '7-Day Streak', icon: '🔥', unlocked: true });
  if (currentStreak >= 30) badges.push({ id: 'thirty_day_streak', name: '30-Day Streak', icon: '💪', unlocked: true });
  if (xp >= 500) badges.push({ id: 'five_hundred_xp', name: '500 XP Earned', icon: '⚡', unlocked: true });
  if (getLevelFromXp(xp) >= 2) badges.push({ id: 'level_up', name: 'Level Up!', icon: '⬆️', unlocked: true });

  if (allProblems && solvedIds) {
    const hasHard = solvedIds.some(id => {
      const p = allProblems.find(prob => prob.id === id);
      return p && (p.difficulty === 'Hard' || p.difficulty === 'Very Hard' || p.difficulty === 'Advanced');
    });
    if (hasHard) badges.push({ id: 'first_hard', name: 'First Hard Problem', icon: '💎', unlocked: true });

    const hasExpert = solvedIds.some(id => {
      const p = allProblems.find(prob => prob.id === id);
      return p && (p.difficulty === 'Expert' || p.difficulty === 'Competitive Programming');
    });
    if (hasExpert) badges.push({ id: 'first_expert', name: 'First Expert Problem', icon: '🚀', unlocked: true });
  }

  return badges;
}

export function analyzeTopics(userProgress, allProblems) {
  const solvedIds = new Set(userProgress.solvedIds || []);
  const submissions = userProgress.submissions || [];
  const topicStats = {};

  allProblems.forEach(p => {
    const tags = p.tags || [];
    tags.forEach(tag => {
      if (!topicStats[tag]) {
        topicStats[tag] = { total: 0, solved: 0, failed: 0, attempts: 0 };
      }
      topicStats[tag].total++;
      if (solvedIds.has(p.id)) {
        topicStats[tag].solved++;
      }
    });
  });

  submissions.forEach(s => {
    const problem = allProblems.find(p => p.id === s.problem_id);
    if (problem) {
      (problem.tags || []).forEach(tag => {
        if (topicStats[tag]) {
          topicStats[tag].attempts++;
          if (s.status !== 'Accepted') {
            topicStats[tag].failed++;
          }
        }
      });
    }
  });

  const strong = Object.entries(topicStats)
    .filter(([, stats]) => stats.solved >= 2)
    .sort(([, a], [, b]) => b.solved - a.solved)
    .slice(0, 5)
    .map(([name, stats]) => ({ name, solved: stats.solved, total: stats.total }));

  const weak = Object.entries(topicStats)
    .filter(([, stats]) => stats.total > 0 && (stats.failed > stats.solved || stats.solved === 0))
    .sort(([, a], [, b]) => (b.failed - b.solved) - (a.failed - a.solved))
    .slice(0, 5)
    .map(([name, stats]) => ({
      name,
      solved: stats.solved,
      total: stats.total,
      attempts: stats.attempts,
      accuracy: stats.attempts > 0 ? stats.solved / stats.attempts : 0,
    }));

  return { strong, weak };
}

export const TEMPLATES = {
  python: '# Write your code here\n\ndef solve():\n    # Read input and solve the problem\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your code here\n    }\n}\n',
  javascript: '// Write your code here\nconst readline = require(\'readline\');\n\nfunction solve(input) {\n    // Process input and return result\n}\n\nmodule.exports = { solve };\n',
  c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}\n',
  rust: 'use std::io;\n\nfn main() {\n    // Write your code here\n}\n',
  php: '<?php\n// Write your code here\n?>\n',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        // Write your code here\n    }\n}\n',
  kotlin: 'fun main() {\n    // Write your code here\n}\n',
  typescript: '// Write your code here\n\nfunction solve(input: string): string {\n    // Process input and return result\n    return "";\n}\n\nexport { solve };\n',
};

export const LANGUAGES = [
  { id: 'python', name: 'Python', extension: '.py' },
  { id: 'java', name: 'Java', extension: '.java' },
  { id: 'javascript', name: 'JavaScript', extension: '.js' },
  { id: 'c', name: 'C', extension: '.c' },
  { id: 'cpp', name: 'C++', extension: '.cpp' },
  { id: 'go', name: 'Go', extension: '.go' },
  { id: 'rust', name: 'Rust', extension: '.rs' },
  { id: 'php', name: 'PHP', extension: '.php' },
  { id: 'csharp', name: 'C#', extension: '.cs' },
  { id: 'kotlin', name: 'Kotlin', extension: '.kt' },
  { id: 'typescript', name: 'TypeScript', extension: '.ts' },
];
