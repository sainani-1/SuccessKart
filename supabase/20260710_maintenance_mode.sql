-- Maintenance mode settings in the existing settings table
-- Keys: maintenance_mode_enabled, maintenance_mode_start, maintenance_mode_end, maintenance_mode_message, registrations_paused

-- Insert default settings if they don't exist
insert into public.settings (key, value)
values
  ('maintenance_mode_enabled', 'false'),
  ('maintenance_mode_start', ''),
  ('maintenance_mode_end', ''),
  ('maintenance_mode_message', 'We are currently undergoing scheduled maintenance. We will be back soon. Thank you for your patience!'),
  ('registrations_paused', 'false')
on conflict (key) do nothing;
