-- Idempotent: safe to run again.
INSERT INTO tbl_templates (code, name, description, config) VALUES
  ('emerald', 'Lục bảo - Rồng phượng', 'Nền xanh rêu đậm, chữ vàng kem, họa tiết rồng phượng',
   '{"theme":{"page":"#FFFFFF","bg":"#17261A","card":"#223526","txt":"#EBD09B","acc":"#EBD09B","dim":"#A39A70","cover":"#030703"},"sections":{"album":true,"countdown":true,"map":true,"schedule":true,"dresscode":true,"guestbook":true,"gifts":true}}'::jsonb)
ON CONFLICT (code) DO NOTHING;
