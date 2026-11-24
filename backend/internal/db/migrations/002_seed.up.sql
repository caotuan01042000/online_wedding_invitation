-- Idempotent seed: safe to run on a DB that already has this data.
INSERT INTO tbl_roles (code, name, description) VALUES
  ('admin', 'Quản trị viên', 'Toàn quyền hệ thống'),
  ('user',  'Người dùng',    'Quản lý thiệp của chính mình')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tbl_permissions (code, description) VALUES
  ('users:manage',       'Quản lý người dùng'),
  ('templates:manage',   'Quản lý mẫu thiệp'),
  ('invitations:manage', 'Quản lý mọi thiệp'),
  ('invitations:own',    'Quản lý thiệp của chính mình')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM tbl_roles r, tbl_permissions p WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM tbl_roles r, tbl_permissions p
WHERE r.code = 'user' AND p.code = 'invitations:own'
ON CONFLICT DO NOTHING;

INSERT INTO tbl_templates (code, name, description, config) VALUES
  ('rose', 'Hồng phấn', 'Mẫu hồng phấn, nhẹ nhàng',
   '{"theme":{"bg":"#FFF8F9","card":"#FFFFFF","txt":"#3B1F2B","acc":"#B83A63","dim":"#9A7A86"},"sections":{"album":true,"countdown":true,"map":true,"schedule":true,"dresscode":true,"guestbook":true,"gifts":true}}'::jsonb),
  ('dragon', 'Rồng phượng', 'Mẫu truyền thống, nền tối',
   '{"theme":{"bg":"#4A1B2D","card":"#5F2A41","txt":"#F8DCE2","acc":"#F2B8C6","dim":"#C99AA8"},"sections":{"album":true,"countdown":true,"map":true,"schedule":true,"dresscode":true,"guestbook":true,"gifts":true}}'::jsonb)
ON CONFLICT (code) DO NOTHING;