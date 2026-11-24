CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== Phân quyền =====
CREATE TABLE IF NOT EXISTS tbl_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(50)  NOT NULL UNIQUE,
  name        varchar(100) NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tbl_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(100) NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tbl_role_permissions (
  role_id       uuid NOT NULL REFERENCES tbl_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES tbl_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ===== Người dùng =====
CREATE TABLE IF NOT EXISTS  tbl_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       uuid NOT NULL REFERENCES tbl_roles(id),
  username      varchar(50)  NOT NULL,
  email         varchar(255),
  password_hash text NOT NULL,
  full_name     varchar(150),
  phone         varchar(20),
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON tbl_users (lower(username)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email    ON tbl_users (lower(email))    WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON tbl_users (role_id);

-- ===== Mẫu thiệp =====
CREATE TABLE IF NOT EXISTS tbl_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(50)  NOT NULL UNIQUE,
  name          varchar(150) NOT NULL,
  description   text,
  thumbnail_url text,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES tbl_users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ===== Thiệp cưới =====
CREATE TABLE IF NOT EXISTS  tbl_invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  template_id  uuid NOT NULL REFERENCES tbl_templates(id),
  slug         varchar(100) NOT NULL UNIQUE,
  title        varchar(200),
  event_date   timestamptz,
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       varchar(20) NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_user     ON tbl_invitations (user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_template ON tbl_invitations (template_id);

CREATE TABLE IF NOT EXISTS tbl_rsvps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES tbl_invitations(id) ON DELETE CASCADE,
  guest_name    varchar(150) NOT NULL,
  is_attending  boolean NOT NULL,
  guest_count   smallint NOT NULL DEFAULT 1 CHECK (guest_count BETWEEN 0 AND 20),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rsvps_invitation ON tbl_rsvps (invitation_id);

CREATE TABLE IF NOT EXISTS tbl_wishes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES tbl_invitations(id) ON DELETE CASCADE,
  guest_name    varchar(150) NOT NULL,
  message       text NOT NULL,
  is_visible    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wishes_invitation ON tbl_wishes (invitation_id);

-- ===== Trigger updated_at =====
DROP TRIGGER IF EXISTS trg_roles_upd ON tbl_roles;
DROP TRIGGER IF EXISTS trg_users_upd ON tbl_users;
DROP TRIGGER IF EXISTS trg_templates_upd ON tbl_templates;
DROP TRIGGER IF EXISTS trg_invitations_upd ON tbl_invitations;

CREATE TRIGGER trg_roles_upd
BEFORE UPDATE ON tbl_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_upd
BEFORE UPDATE ON tbl_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_templates_upd
BEFORE UPDATE ON tbl_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_invitations_upd
BEFORE UPDATE ON tbl_invitations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

