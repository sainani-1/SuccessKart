// Weekly contest model
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
// Stores contest info, questions, and schedule
export const weeklyContest = {
  day: 'Monday',
  startTime: '20:00',
  endTime: '22:00',
  questions: [],
  autoPublish: {
    enabled: false,
    publishBeforeMinutes: 10,
  },
  lastGeneratedWeek: null,
  async load() {
    const docRef = doc(db, 'logicBuilding', 'weeklyContest');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      this.day = data.day;
      this.startTime = data.startTime;
      this.endTime = data.endTime;
      this.questions = data.questions || [];
      if (data.autoPublish) {
        this.autoPublish = {
          enabled: data.autoPublish.enabled || false,
          publishBeforeMinutes: data.autoPublish.publishBeforeMinutes || 10,
        };
      }
      this.lastGeneratedWeek = data.lastGeneratedWeek || null;
    }
  },
  async save() {
    const docRef = doc(db, 'logicBuilding', 'weeklyContest');
    await setDoc(docRef, {
      day: this.day,
      startTime: this.startTime,
      endTime: this.endTime,
      questions: this.questions,
      autoPublish: this.autoPublish,
      lastGeneratedWeek: this.lastGeneratedWeek,
    });
  },
  subscribe(callback) {
    const docRef = doc(db, 'logicBuilding', 'weeklyContest');
    return onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        this.day = data.day;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.questions = data.questions || [];
        if (data.autoPublish) {
          this.autoPublish = {
            enabled: data.autoPublish.enabled || false,
            publishBeforeMinutes: data.autoPublish.publishBeforeMinutes || 10,
          };
        }
        this.lastGeneratedWeek = data.lastGeneratedWeek || null;
        callback();
      }
    });
  },
  setSchedule(day, startTime, endTime) {
    this.day = day;
    this.startTime = startTime;
    this.endTime = endTime;
  },
  setQuestions(questions) {
    this.questions = questions;
  },
  setAutoPublish(enabled, publishBeforeMinutes) {
    this.autoPublish = {
      enabled,
      publishBeforeMinutes: publishBeforeMinutes || 10,
    };
  },
  setLastGeneratedWeek(weekKey) {
    this.lastGeneratedWeek = weekKey;
  },
};


export async function isContestActive() {
  const state = await getContestResultState();
  return state.isActive;
}

const getServerDate = async () => {
  const serverTimeDoc = doc(db, 'logicBuilding', 'serverTime');
  try {
    await setDoc(serverTimeDoc, { ts: serverTimestamp() });
    const snap = await getDoc(serverTimeDoc);
    if (snap.exists() && snap.data().ts) {
      return snap.data().ts.toDate();
    }
  } catch (e) {
    // fallback below
  }
  return new Date();
};

const getDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export async function getContestResultState() {
  const date = await getServerDate();
  const day = date.toLocaleString('en-US', { weekday: 'long' });
  const [startHour, startMin] = weeklyContest.startTime.split(':').map(Number);
  const [endHour, endMin] = weeklyContest.endTime.split(':').map(Number);
  const nowHour = date.getHours();
  const nowMin = date.getMinutes();
  const shouldLog = import.meta.env.DEV && import.meta.env.VITE_LOGIC_BUILDING_DEBUG === 'true';

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const nowMinutes = nowHour * 60 + nowMin;
  const isContestDay = day === weeklyContest.day;
  let inWindow = false;
  let isResultTime = false;

  if (endMinutes > startMinutes) {
    inWindow = isContestDay && nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    isResultTime = isContestDay && nowMinutes > endMinutes;
  } else {
    // For windows crossing midnight, publish results after the end time on the next calendar day.
    inWindow = isContestDay ? nowMinutes >= startMinutes : nowMinutes <= endMinutes;
    isResultTime = !isContestDay && nowMinutes > endMinutes && nowMinutes < startMinutes;
  }



  return {
    checkedAt: date,
    contestKey: `logic-${weeklyContest.day}-${getDateKey(date)}-${weeklyContest.startTime}-${weeklyContest.endTime}`,
    isContestDay,
    isActive: inWindow,
    isResultTime,
  };
}

export function getContestQuestions() {
  return weeklyContest.questions;
}

export function setContestQuestions(questions) {
  weeklyContest.setQuestions(questions);
}

// Get ISO week key (YYYY-Wxx) for tracking weekly generation
export function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Check if questions need to be regenerated for a new week
export function needsWeeklyGeneration() {
  const currentWeek = getWeekKey(new Date());
  return weeklyContest.lastGeneratedWeek !== currentWeek;
}

// Get the scheduled contest datetime for comparison
export function getNextContestDateTime() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const targetDay = days.indexOf(weeklyContest.day);
  const [startHour, startMin] = weeklyContest.startTime.split(':').map(Number);

  const contestDate = new Date(now);
  contestDate.setHours(startHour, startMin, 0, 0);

  const currentDay = now.getDay();
  let daysUntilContest = (targetDay - currentDay + 7) % 7;
  if (daysUntilContest === 0 && contestDate <= now) {
    daysUntilContest = 7;
  }
  contestDate.setDate(contestDate.getDate() + daysUntilContest);

  return contestDate;
}
