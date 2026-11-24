CREATE TABLE IF NOT EXISTS tbl_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES tbl_invitations(id) ON DELETE CASCADE,
  kind          varchar(20) NOT NULL
                CHECK (kind IN ('cover', 'hero', 'groom', 'bride', 'photo', 'background', 'qr', 'music')),
  storage_key   text NOT NULL,
  url           text NOT NULL,
  mime_type     varchar(100) NOT NULL,
  size_bytes    bigint NOT NULL CHECK (size_bytes > 0),
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_invitation ON tbl_media (invitation_id, kind, sort_order);

ALTER TABLE tbl_wedding_gifts
  ADD COLUMN IF NOT EXISTS qr_media_id uuid REFERENCES tbl_media(id) ON DELETE SET NULL;