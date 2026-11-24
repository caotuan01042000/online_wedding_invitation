DROP TABLE IF EXISTS tbl_wedding_gifts;
DROP TABLE IF EXISTS tbl_wedding_schedules;
DROP TABLE IF EXISTS tbl_wedding_people;
DROP TABLE IF EXISTS tbl_wedding_infos;

ALTER TABLE tbl_invitations
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS view_count,
  ADD COLUMN IF NOT EXISTS event_date timestamptz;