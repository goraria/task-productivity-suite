BEGIN;
CREATE TABLE IF NOT EXISTS resource_policy_outbox (
  id text PRIMARY KEY CHECK (id = 'task'),
  epoch uuid NOT NULL DEFAULT gen_random_uuid(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  delivered_revision bigint NOT NULL DEFAULT 0,
  delivered_at timestamptz,
  dispatch_token uuid,
  dispatch_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);
INSERT INTO resource_policy_outbox(id) VALUES ('task') ON CONFLICT DO NOTHING;

-- A transactional coalescing outbox: rollback of the mutation also rolls back
-- revision. Serialized row updates preserve committed stream ordering.
CREATE OR REPLACE FUNCTION mark_resource_policy_changed() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE resource_policy_outbox SET revision = revision + 1 WHERE id = 'task';
  IF NOT FOUND THEN RAISE EXCEPTION 'missing_resource_policy_outbox'; END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS resource_policy_change ON workspace_member;
CREATE TRIGGER resource_policy_change AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
ON workspace_member FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();
DROP TRIGGER IF EXISTS resource_policy_change ON permission;
CREATE TRIGGER resource_policy_change AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
ON permission FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();

DROP TRIGGER IF EXISTS resource_policy_change ON workspace;
CREATE TRIGGER resource_policy_change AFTER INSERT OR DELETE OR TRUNCATE
ON workspace FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();
DROP TRIGGER IF EXISTS resource_policy_update ON workspace;
CREATE TRIGGER resource_policy_update AFTER UPDATE OF owner_id
ON workspace FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();

DROP TRIGGER IF EXISTS resource_policy_change ON page;
CREATE TRIGGER resource_policy_change AFTER INSERT OR DELETE OR TRUNCATE
ON page FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();
DROP TRIGGER IF EXISTS resource_policy_update ON page;
CREATE TRIGGER resource_policy_update AFTER UPDATE OF workspace_id, is_archived, is_published, published_at, parent_page_id
ON page FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();

DROP TRIGGER IF EXISTS resource_policy_change ON "user";
CREATE TRIGGER resource_policy_change AFTER INSERT OR DELETE OR TRUNCATE
ON "user" FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();
DROP TRIGGER IF EXISTS resource_policy_update ON "user";
CREATE TRIGGER resource_policy_update AFTER UPDATE OF external_user_id, role, status,
sso_status, deleted_at, banned_at, ban_expires
ON "user" FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();
COMMIT;
