CREATE OR REPLACE FUNCTION check_reviewer_assignment_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM reviewer_assignments
  WHERE manuscript_id = NEW.manuscript_id
    AND round_number = NEW.round_number
    AND assignment_status IN ('invited', 'accepted')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

  IF active_count >= 2 THEN
    RAISE EXCEPTION 'Cannot assign more than 2 active reviewers per manuscript round';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_limit_reviewer_assignments
BEFORE INSERT OR UPDATE ON reviewer_assignments
FOR EACH ROW EXECUTE FUNCTION check_reviewer_assignment_limit();
