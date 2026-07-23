// Auto-publish scheduler for weekly contest questions
// Generates new questions automatically 10 minutes before contest starts
import { weeklyContest, getWeekKey, needsWeeklyGeneration } from './contestModel';
import { generateAllQuestions } from './generateQuestions';
import { setContestQuestions } from './contestModel';
import { logError } from '../utils/errorLogger';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
let schedulerInterval = null;
let isGenerating = false;
let lastCheckedWeek = null;

// Get the scheduled contest datetime for this week
function getThisWeekContestDateTime() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const targetDay = days.indexOf(weeklyContest.day);
  const [startHour, startMin] = weeklyContest.startTime.split(':').map(Number);

  const contestDate = new Date(now);
  contestDate.setHours(startHour, startMin, 0, 0);

  const currentDay = now.getDay();
  let daysUntilContest = (targetDay - currentDay + 7) % 7;
  if (daysUntilContest === 0 && contestDate <= now) {
    // Contest already happened today or is happening now, check next week
    daysUntilContest = 7;
  }
  contestDate.setDate(contestDate.getDate() + daysUntilContest);

  return contestDate;
}

// Check if we're within the auto-publish window
function isInPublishWindow() {
  if (!weeklyContest.autoPublish.enabled) return false;

  const now = new Date();
  const contestStart = getThisWeekContestDateTime();
  const publishBefore = weeklyContest.autoPublish.publishBeforeMinutes || 10;
  const publishTime = new Date(contestStart.getTime() - publishBefore * 60 * 1000);

  // We're in the publish window if:
  // 1. Current time is >= publishTime (10 min before contest)
  // 2. Current time is <= contestStart (contest hasn't ended yet, with some buffer)
  // 3. We haven't already generated for this week
  return now >= publishTime && now <= contestStart;
}

// Generate and publish new questions
async function generateAndPublishQuestions() {
  if (isGenerating) {
    return { success: false, reason: 'already_generating' };
  }

  const currentWeek = getWeekKey(new Date());

  // Check if we already generated this week
  if (weeklyContest.lastGeneratedWeek === currentWeek) {
    return { success: false, reason: 'already_generated' };
  }

  isGenerating = true;

  try {
    const newQuestions = await generateAllQuestions((progress) => {
      // Could dispatch event for progress updates if needed
    });

    // Update the weekly contest with new questions
    setContestQuestions(newQuestions);
    weeklyContest.setLastGeneratedWeek(currentWeek);
    await weeklyContest.save();

    // Dispatch event so UI can update
    window.dispatchEvent(new Event('weeklyContestUpdated'));

    return { success: true, questions: newQuestions };
  } catch (error) {
    logError({
      message: 'Auto-publish question generation failed',
      source: 'autoPublishScheduler',
      details: error
    });
    return { success: false, reason: 'generation_failed', error };
  } finally {
    isGenerating = false;
  }
}

// Main scheduler check function
async function checkAndAutoPublish() {
  try {
    // Always load latest config first
    await weeklyContest.load();

    // Check if auto-publish is enabled and we're in the publish window
    if (weeklyContest.autoPublish.enabled && isInPublishWindow()) {
      const currentWeek = getWeekKey(new Date());

      // Only generate if we haven't for this week
      if (lastCheckedWeek !== currentWeek) {
        lastCheckedWeek = currentWeek;
        const result = await generateAndPublishQuestions();
        if (result.success) {
          window.dispatchEvent(new Event('autoPublishComplete'));
        }
      }
    }
  } catch (error) {
    logError({
      message: 'Auto-publish scheduler check failed',
      source: 'autoPublishScheduler',
      details: error
    });
  }
}

// Start the auto-publish scheduler
export function startAutoPublishScheduler() {
  if (schedulerInterval) {
    return; // Already running
  }

  // Run immediately on start
  checkAndAutoPublish();

  // Then check every minute
  schedulerInterval = setInterval(checkAndAutoPublish, CHECK_INTERVAL_MS);
}

// Stop the auto-publish scheduler
export function stopAutoPublishScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// Manual trigger for auto-publish (for admin testing)
export async function triggerAutoPublish() {
  return generateAndPublishQuestions();
}

// Get scheduler status
export function getSchedulerStatus() {
  return {
    isRunning: !!schedulerInterval,
    isGenerating,
    autoPublishEnabled: weeklyContest.autoPublish.enabled,
    lastGeneratedWeek: weeklyContest.lastGeneratedWeek,
    currentWeek: getWeekKey(new Date()),
    needsGeneration: needsWeeklyGeneration(),
    publishBeforeMinutes: weeklyContest.autoPublish.publishBeforeMinutes,
  };
}
