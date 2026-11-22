-- Idempotent: safe to run again.
INSERT INTO tbl_templates (code, name, description, config) VALUES
  ('forest', 'Rừng xanh - Kem', 'Nền kem, mảng xanh rêu bán nguyệt, ảnh vòm, tiêu đề dải xanh',
   '{"theme":{"page":"#FFFFFF","paper":"#FEF5EA","ink":"#213B27","deep":"#0B1F0C","mint":"#C8F0DA","dim":"#6B6B5E","card":"#FFFFFF"},"sections":{"album":true,"countdown":false,"map":true,"schedule":true,"dresscode":true,"guestbook":true,"gifts":true}}'::jsonb)
ON CONFLICT (code) DO NOTHING;
