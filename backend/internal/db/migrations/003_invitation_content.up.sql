-- event_date is dropped: tbl_wedding_infos is the single source of truth for dates.
ALTER TABLE tbl_invitations
  DROP COLUMN IF EXISTS event_date,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES tbl_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS tbl_wedding_infos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id    uuid NOT NULL UNIQUE REFERENCES tbl_invitations(id) ON DELETE CASCADE,
  ceremony_at      timestamptz NOT NULL,
  ceremony_place   text,
  party_at         timestamptz,
  venue_name       varchar(200),
  venue_address    text,
  map_url          text,
  lunar_text       varchar(100),
  dress_code       varchar(200),
  dress_colors     text[] NOT NULL DEFAULT '{}',
  closing_message  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tbl_wedding_people (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id  uuid NOT NULL REFERENCES tbl_invitations(id) ON DELETE CASCADE,
  side           varchar(10) NOT NULL CHECK (side IN ('groom', 'bride')),
  short_name     varchar(50)  NOT NULL,
  full_name      varchar(150) NOT NULL,
  rank_label     varchar(50),
  father_name    varchar(150),
  mother_name    varchar(150),
  family_address text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invitation_id, side)
);

CREATE TABLE IF NOT EXISTS tbl_wedding_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES tbl_invitations(id) ON DELETE CASCADE,
  at_time       time NOT NULL,
  title         varchar(200) NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_schedules_invitation ON tbl_wedding_schedules (invitation_id, sort_order);

-- qr_media_id is added together with tbl_media in the upload phase.
CREATE TABLE IF NOT EXISTS tbl_wedding_gifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES tbl_invitations(id) ON DELETE CASCADE,
  side          varchar(10) NOT NULL CHECK (side IN ('groom', 'bride')),
  bank_name     varchar(100) NOT NULL,
  account_no    varchar(50)  NOT NULL,
  account_name  varchar(150) NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gifts_invitation ON tbl_wedding_gifts (invitation_id, sort_order);

DROP TRIGGER IF EXISTS trg_wedding_infos_upd ON tbl_wedding_infos;
DROP TRIGGER IF EXISTS trg_wedding_people_upd ON tbl_wedding_people;
CREATE TRIGGER trg_wedding_infos_upd BEFORE UPDATE ON tbl_wedding_infos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wedding_people_upd BEFORE UPDATE ON tbl_wedding_people
FOR EACH ROW EXECUTE FUNCTION set_updated_at();