-- Only removes the template when no invitation uses it.
DELETE FROM tbl_templates t
WHERE t.code = 'botanical'
  AND NOT EXISTS (SELECT 1 FROM tbl_invitations i WHERE i.template_id = t.id);
