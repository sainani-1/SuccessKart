import { supabase } from '../supabaseClient';

const AHI_API_KEY_KEY = 'ahi_groq_api_key';
const AHI_AUTHORIZED_USERS_KEY = 'ahi_authorized_users';

export const getGroqApiKey = async () => {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', AHI_API_KEY_KEY)
    .maybeSingle();
  return data?.value || null;
};

export const setGroqApiKey = async (key) => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: AHI_API_KEY_KEY, value: key }, { onConflict: 'key' });
  return error;
};

export const getAuthorizedUsers = async () => {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', AHI_AUTHORIZED_USERS_KEY)
    .maybeSingle();
  try {
    const parsed = JSON.parse(data?.value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setAuthorizedUsers = async (userIds) => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: AHI_AUTHORIZED_USERS_KEY, value: JSON.stringify(userIds) }, { onConflict: 'key' });
  return error;
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const callGroq = async (apiKey, messages) => {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
};

export const INTERVIEW_SYSTEM_PROMPT = `You are an AI interviewer conducting a professional job interview. Your name is "Alex".

Guidelines:
- Speak naturally and conversationally, as a human interviewer would.
- Ask one question at a time. Wait for the candidate's response before continuing.
- Start by greeting the candidate and introducing yourself.
- After the candidate answers, acknowledge their response briefly before asking the next question.
- Cover these areas across rounds:自我介绍, work experience, technical skills, problem-solving, behavioral questions, career goals.
- Each round should have 2-3 questions.
- After all rounds, thank the candidate and end the interview.
- Keep responses concise (2-3 sentences max per turn).
- Use a friendly but professional tone.`;

export const INTERVIEW_QUESTIONS = {
  intro: [
    'Could you start by introducing yourself and telling me about your background?',
    'What brings you to apply for this position?',
    'What do you know about our company and what we do?',
  ],
  experience: [
    'Can you walk me through your most recent role and key responsibilities?',
    'What project are you most proud of and why?',
    'How do you handle tight deadlines or pressure at work?',
  ],
  technical: [
    'What technical skills do you consider your strongest?',
    'Describe a technical challenge you faced and how you solved it.',
    'How do you stay updated with industry trends and new technologies?',
  ],
  behavioral: [
    'Tell me about a time you had a conflict with a team member. How did you resolve it?',
    'Describe a situation where you had to learn something new quickly.',
    'What would your previous manager say about your work style?',
  ],
  goals: [
    'Where do you see yourself in the next 3-5 years?',
    'What type of work environment do you thrive in?',
    'Do you have any questions for me about the role or company?',
  ],
};

export const INTERVIEW_ROUNDS = [
  { key: 'intro', label: 'Introduction', description: 'Getting to know you' },
  { key: 'experience', label: 'Work Experience', description: 'Your professional background' },
  { key: 'technical', label: 'Technical Skills', description: 'Assessing your expertise' },
  { key: 'behavioral', label: 'Behavioral', description: 'How you handle situations' },
  { key: 'goals', label: 'Goals & Fit', description: 'Future plans and questions' },
];
