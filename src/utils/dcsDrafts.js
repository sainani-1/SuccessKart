// Local autosave for the coding streak. A student often closes the tab by
// accident, so every in-progress answer is written to localStorage and restored
// next time. The database is updated only when they press Submit.
const draftKey = (contestId) => `dcs_drafts_${contestId}`;

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — silently keep going
  }
};

export const readAllDrafts = (contestId) => {
  if (!contestId) return null;
  return safeRead(draftKey(contestId));
};

export const readQuestionDraft = (contestId, questionId) => {
  if (!contestId || !questionId) return null;
  const drafts = readAllDrafts(contestId);
  return drafts?.[questionId] || null;
};

export const saveQuestionDraft = (contestId, { questionId, code, language }) => {
  if (!contestId || !questionId || typeof localStorage === 'undefined') return;
  const drafts = readAllDrafts(contestId) || {};
  drafts[questionId] = { code, language, updatedAt: new Date().toISOString() };
  safeWrite(draftKey(contestId), drafts);
};

export const clearQuestionDraft = (contestId, questionId) => {
  if (!contestId || !questionId) return;
  const drafts = readAllDrafts(contestId);
  if (!drafts) return;
  delete drafts[questionId];
  safeWrite(draftKey(contestId), drafts);
};

export const readDefaultLanguage = () => {
  try {
    return localStorage.getItem('dcs_default_language') || '';
  } catch {
    return '';
  }
};

export const writeDefaultLanguage = (languageKey) => {
  try {
    if (languageKey) localStorage.setItem('dcs_default_language', languageKey);
    else localStorage.removeItem('dcs_default_language');
  } catch {
    // ignore storage errors
  }
};

export default {
  readAllDrafts,
  readQuestionDraft,
  saveQuestionDraft,
  clearQuestionDraft,
  readDefaultLanguage,
  writeDefaultLanguage,
};