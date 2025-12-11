-- Add additional cabinet settings
INSERT INTO public.settings (key, value) VALUES 
  ('doctor_first_name', ''),
  ('doctor_last_name', ''),
  ('doctor_email', ''),
  ('doctor_phone', '+212'),
  ('cabinet_address', ''),
  ('cabinet_zip_code', ''),
  ('cabinet_city', ''),
  ('cabinet_phone', '+212'),
  ('open_time', '08:00'),
  ('close_time', '19:00')
ON CONFLICT (key) DO NOTHING;