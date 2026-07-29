import { supabase } from '../supabaseClient';

const SETTINGS_KEY = 'skillup_granted_users';

export const fetchSkillUpGrantedUsers = async () => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    const users = JSON.parse(data?.value || '[]');
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
};

export const isSkillUpGranted = (grantedUsers, userId) => {
  return grantedUsers.some((u) => u.id === userId);
};

export const grantSkillUpAccess = async (userId, grantedBy) => {
  const users = await fetchSkillUpGrantedUsers();
  if (users.some((u) => u.id === userId)) return { error: 'User already has access' };

  const updated = [...users, { id: userId, granted_by: grantedBy, granted_at: new Date().toISOString() }];

  const { error } = await supabase
    .from('settings')
    .upsert({ key: SETTINGS_KEY, value: JSON.stringify(updated) }, { onConflict: 'key' });

  return { error: error?.message || null };
};

export const revokeSkillUpAccess = async (userId) => {
  const users = await fetchSkillUpGrantedUsers();
  const updated = users.filter((u) => u.id !== userId);

  const { error } = await supabase
    .from('settings')
    .upsert({ key: SETTINGS_KEY, value: JSON.stringify(updated) }, { onConflict: 'key' });

  return { error: error?.message || null };
};
