import { supabase } from '../supabaseClient';

export const HIDE_FACE_REGISTRATION_KEY = 'hide_face_registration';

export const isFaceRegistrationHidden = async () => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', HIDE_FACE_REGISTRATION_KEY)
      .maybeSingle();
    return data?.value === 'true';
  } catch {
    return false;
  }
};

export const setFaceRegistrationHidden = async (hidden) => {
  const { error } = await supabase.from('settings').upsert(
    { key: HIDE_FACE_REGISTRATION_KEY, value: String(Boolean(hidden)) },
    { onConflict: 'key' }
  );
  if (error) throw error;
};