import { supabase } from '../supabaseClient';

export const logAdminAction = async ({ action, target_type, target_id, details, performed_by }) => {
  try {
    await supabase.from('admin_audit_log').insert({
      action,
      target_type,
      target_id,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      performed_by,
      created_at: new Date().toISOString(),
    });
  } catch {
    // audit log should never break anything
  }
};

export const AUDIT_ACTIONS = {
  USER_APPROVE: 'user_approve',
  USER_REJECT: 'user_reject',
  USER_DELETE: 'user_delete',
  USER_DISABLE: 'user_disable',
  USER_LOCK: 'user_lock',
  PAYMENT_APPROVE: 'payment_approve',
  PAYMENT_REJECT: 'payment_reject',
  COURSE_CREATE: 'course_create',
  COURSE_UPDATE: 'course_update',
  COURSE_DELETE: 'course_delete',
  ASSIGNMENT_CREATE: 'assignment_create',
  SETTINGS_CHANGE: 'settings_change',
  EMAIL_SEND: 'email_send',
  BULK_IMPORT: 'bulk_import',
  PUSH_SEND: 'push_send',
};
