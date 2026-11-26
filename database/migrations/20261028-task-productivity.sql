BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('task-productivity-20261028', 0));
-- Task domain migration. Auth/session/account and platform-owned tables are untouched.
-- Removes the incorrect user-only FK on polymorphic permission.subject_id; no data is deleted.
ALTER TABLE page ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE block ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='page' AND column_name='access_mode') THEN
    ALTER TABLE page ADD COLUMN access_mode varchar(16) NOT NULL DEFAULT 'workspace' CHECK(access_mode IN ('workspace','restricted'));
    UPDATE page SET access_mode='restricted' WHERE EXISTS(SELECT 1 FROM permission WHERE permission.page_id=page.id AND subject_type <> 'public');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='database' AND column_name='access_mode') THEN
    ALTER TABLE "database" ADD COLUMN access_mode varchar(16) NOT NULL DEFAULT 'workspace' CHECK(access_mode IN ('workspace','restricted'));
    UPDATE "database" SET access_mode='restricted' WHERE EXISTS(SELECT 1 FROM permission WHERE permission.database_id="database".id AND subject_type <> 'public');
  END IF;
END $$;
-- A workspace grant identifies workspace.id, while a user grant identifies user.id.
DO $$ DECLARE constraint_name text; BEGIN
  FOR constraint_name IN SELECT c.conname FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.conrelid='permission'::regclass AND c.contype='f' AND a.attname='subject_id'
  LOOP EXECUTE format('ALTER TABLE permission DROP CONSTRAINT %I', constraint_name); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION validate_task_permission_subject() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
  IF NEW.subject_type='workspace' AND NEW.subject_id IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace grant must identify its workspace' USING ERRCODE='23514';
  ELSIF NEW.subject_type='user' AND NOT EXISTS(SELECT 1 FROM "user" WHERE id=NEW.subject_id) THEN
    RAISE EXCEPTION 'User grant must identify an existing user' USING ERRCODE='23503';
  ELSIF NEW.subject_type='public' AND (NEW.level<>'view' OR NEW.subject_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Public grants must be read-only' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS task_permission_subject ON permission;
CREATE TRIGGER task_permission_subject BEFORE INSERT OR UPDATE ON permission FOR EACH ROW EXECUTE FUNCTION validate_task_permission_subject();
CREATE UNIQUE INDEX IF NOT EXISTS permission_target_subject_key ON permission(workspace_id,coalesce(page_id::text,''),coalesce(database_id::text,''),subject_type,coalesce(subject_id::text,''));
CREATE INDEX IF NOT EXISTS permission_page_subject_idx ON permission(page_id,subject_type,subject_id);
CREATE INDEX IF NOT EXISTS permission_database_subject_idx ON permission(database_id,subject_type,subject_id);
CREATE TABLE IF NOT EXISTS document_presence (
  page_id uuid NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(page_id,user_id)
);
CREATE TABLE IF NOT EXISTS document_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL, entity_type varchar(16) NOT NULL CHECK(entity_type IN ('page','block')),
  version integer NOT NULL, snapshot jsonb NOT NULL,
  created_by_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS document_revision_entity_version_key ON document_revision(entity_id,version);
CREATE INDEX IF NOT EXISTS document_revision_page_created_idx ON document_revision(page_id,created_at);
CREATE TABLE IF NOT EXISTS sprint (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL, goal text, status varchar(16) NOT NULL DEFAULT 'planned',
  starts_at timestamp, ends_at timestamp, completed_at timestamp, created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT sprint_status_check CHECK(status IN ('planned','active','completed')),
  CONSTRAINT sprint_dates_check CHECK(starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS sprint_workspace_idx ON sprint(workspace_id);
CREATE TABLE IF NOT EXISTS work_item (
  page_id uuid PRIMARY KEY REFERENCES page(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  number integer NOT NULL, kind varchar(16) NOT NULL DEFAULT 'task', status varchar(24) NOT NULL DEFAULT 'backlog',
  priority varchar(16) NOT NULL DEFAULT 'medium', assignee_id uuid REFERENCES "user"(id) ON DELETE SET NULL,
  sprint_id uuid REFERENCES sprint(id) ON DELETE SET NULL, due_at timestamp, estimate integer, completed_at timestamp,
  CONSTRAINT work_item_kind_check CHECK(kind IN ('task','bug','story','epic')),
  CONSTRAINT work_item_status_check CHECK(status IN ('backlog','todo','in_progress','review','done','cancelled')),
  CONSTRAINT work_item_priority_check CHECK(priority IN ('low','medium','high','urgent')),
  CONSTRAINT work_item_estimate_check CHECK(estimate IS NULL OR estimate >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS work_item_workspace_number_key ON work_item(workspace_id,number);
CREATE INDEX IF NOT EXISTS work_item_sprint_idx ON work_item(sprint_id);
CREATE TABLE IF NOT EXISTS issue_dependency (
  page_id uuid NOT NULL REFERENCES work_item(page_id) ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES work_item(page_id) ON DELETE CASCADE,
  PRIMARY KEY(page_id,depends_on_id), CONSTRAINT issue_dependency_self_check CHECK(page_id <> depends_on_id)
);
CREATE TABLE IF NOT EXISTS task_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  page_id uuid, actor_id uuid REFERENCES "user"(id) ON DELETE SET NULL,
  type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
  delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
-- Outbox messages must survive aggregate deletion. Keep the historical UUID,
-- with no content copy, instead of cascading away undelivered tombstones.
DO $$ DECLARE constraint_name text; BEGIN
  FOR constraint_name IN SELECT c.conname FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.conrelid='task_event_outbox'::regclass AND c.contype='f' AND a.attname='workspace_id'
  LOOP EXECUTE format('ALTER TABLE task_event_outbox DROP CONSTRAINT %I',constraint_name); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION enqueue_task_workspace_deletion() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
  INSERT INTO task_event_outbox(workspace_id,page_id,type,payload)
    SELECT OLD.id,p.id,'page.deleted',jsonb_build_object('revision',p.version)
    FROM page p WHERE p.workspace_id=OLD.id;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS task_workspace_deletion ON workspace;
CREATE TRIGGER task_workspace_deletion BEFORE DELETE ON workspace FOR EACH ROW EXECUTE FUNCTION enqueue_task_workspace_deletion();
ALTER TABLE task_event_outbox ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE task_event_outbox ADD COLUMN IF NOT EXISTS sequence bigint GENERATED ALWAYS AS IDENTITY;
CREATE INDEX IF NOT EXISTS task_event_page_sequence_idx ON task_event_outbox(page_id,sequence DESC);
CREATE INDEX IF NOT EXISTS task_event_pending_idx ON task_event_outbox(delivered_at,available_at);
-- No content/body copies in this outbox. Workers re-read current authorization,
-- publication and assignment before emitting external events.
CREATE OR REPLACE FUNCTION enqueue_task_document_event() RETURNS trigger
LANGUAGE plpgsql SET search_path = public,pg_temp AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM workspace WHERE id = r.workspace_id) THEN RETURN NULL; END IF;
  INSERT INTO task_event_outbox(workspace_id,page_id,actor_id,type,payload)
    VALUES(r.workspace_id,r.id,CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE r.updated_by_id END,
      CASE WHEN TG_OP = 'DELETE' THEN 'page.deleted' ELSE 'page.changed' END,
      jsonb_build_object('revision',r.version));
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS task_document_event ON page;
CREATE TRIGGER task_document_event AFTER INSERT OR UPDATE OR DELETE ON page
  FOR EACH ROW EXECUTE FUNCTION enqueue_task_document_event();
CREATE OR REPLACE FUNCTION touch_task_document() RETURNS trigger
LANGUAGE plpgsql SET search_path = public,pg_temp AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  UPDATE page SET updated_at = now(), updated_by_id = coalesce(r.updated_by_id,r.created_by_id) WHERE id = r.page_id;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS task_block_document ON block;
CREATE TRIGGER task_block_document AFTER INSERT OR UPDATE OR DELETE ON block
  FOR EACH ROW EXECUTE FUNCTION touch_task_document();
DO $$ BEGIN
  IF to_regprocedure('mark_resource_policy_changed()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS resource_policy_access_mode ON page;
    CREATE TRIGGER resource_policy_access_mode AFTER UPDATE OF access_mode,database_id ON page FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();
    DROP TRIGGER IF EXISTS resource_policy_database ON "database";
    CREATE TRIGGER resource_policy_database AFTER UPDATE OF access_mode,is_archived ON "database" FOR EACH STATEMENT EXECUTE FUNCTION mark_resource_policy_changed();
  END IF;
END $$;
-- Every change affecting a public document produces a newer durable discovery
-- cursor. Descendants also need tombstones when an ancestor is archived/moved.
CREATE OR REPLACE FUNCTION touch_task_permission_document() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
  IF TG_OP <> 'INSERT' AND OLD.page_id IS NOT NULL AND OLD.subject_type='public' THEN
    UPDATE page SET version=version+1,updated_at=clock_timestamp() WHERE id=OLD.page_id;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.page_id IS NOT NULL AND NEW.subject_type='public' THEN
    UPDATE page SET version=version+1,updated_at=clock_timestamp() WHERE id=NEW.page_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS task_permission_document ON permission;
CREATE TRIGGER task_permission_document AFTER INSERT OR UPDATE OR DELETE ON permission FOR EACH ROW EXECUTE FUNCTION touch_task_permission_document();
CREATE OR REPLACE FUNCTION touch_task_descendant_document() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
  IF OLD.is_archived IS DISTINCT FROM NEW.is_archived OR OLD.parent_page_id IS DISTINCT FROM NEW.parent_page_id THEN
    WITH RECURSIVE descendants AS (
      SELECT id FROM page WHERE parent_page_id=NEW.id
      UNION SELECT child.id FROM page child JOIN descendants d ON child.parent_page_id=d.id
    ) UPDATE page SET version=version+1,updated_at=clock_timestamp() WHERE id IN (SELECT id FROM descendants) AND id<>NEW.id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS task_descendant_document ON page;
CREATE TRIGGER task_descendant_document AFTER UPDATE OF is_archived,parent_page_id ON page FOR EACH ROW EXECUTE FUNCTION touch_task_descendant_document();
COMMIT;
