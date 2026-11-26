CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended', 'deleted');--> statement-breakpoint
ALTER TABLE "blocks" RENAME TO "block";--> statement-breakpoint
ALTER TABLE "database_properties" RENAME TO "database_property";--> statement-breakpoint
ALTER TABLE "database_views" RENAME TO "database_view";--> statement-breakpoint
ALTER TABLE "databases" RENAME TO "database";--> statement-breakpoint
ALTER TABLE "files" RENAME TO "file";--> statement-breakpoint
ALTER TABLE "page_property_values" RENAME TO "page_property_value";--> statement-breakpoint
ALTER TABLE "pages" RENAME TO "page";--> statement-breakpoint
ALTER TABLE "permissions" RENAME TO "permission";--> statement-breakpoint
ALTER TABLE "workspace_members" RENAME TO "workspace_member";--> statement-breakpoint
ALTER TABLE "workspaces" RENAME TO "workspace";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "file" DROP CONSTRAINT "files_size_check";--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permissions_resource_check";--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permissions_subject_check";--> statement-breakpoint
ALTER TABLE "block" DROP CONSTRAINT "blocks_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "block" DROP CONSTRAINT "blocks_page_id_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "block" DROP CONSTRAINT "blocks_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "block" DROP CONSTRAINT "blocks_updated_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "block" DROP CONSTRAINT "blocks_parent_block_id_fkey";
--> statement-breakpoint
ALTER TABLE "database_property" DROP CONSTRAINT "database_properties_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "database_property" DROP CONSTRAINT "database_properties_database_id_databases_id_fk";
--> statement-breakpoint
ALTER TABLE "database_view" DROP CONSTRAINT "database_views_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "database_view" DROP CONSTRAINT "database_views_database_id_databases_id_fk";
--> statement-breakpoint
ALTER TABLE "database_view" DROP CONSTRAINT "database_views_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "database" DROP CONSTRAINT "databases_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "database" DROP CONSTRAINT "databases_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "file" DROP CONSTRAINT "files_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "file" DROP CONSTRAINT "files_page_id_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "file" DROP CONSTRAINT "files_block_id_blocks_id_fk";
--> statement-breakpoint
ALTER TABLE "file" DROP CONSTRAINT "files_uploaded_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "page_property_value" DROP CONSTRAINT "page_property_values_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "page_property_value" DROP CONSTRAINT "page_property_values_page_id_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "page_property_value" DROP CONSTRAINT "page_property_values_property_id_database_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "page" DROP CONSTRAINT "pages_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "page" DROP CONSTRAINT "pages_database_id_databases_id_fk";
--> statement-breakpoint
ALTER TABLE "page" DROP CONSTRAINT "pages_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "page" DROP CONSTRAINT "pages_updated_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "page" DROP CONSTRAINT "pages_parent_page_id_fkey";
--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permissions_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permissions_page_id_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permissions_database_id_databases_id_fk";
--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permissions_subject_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permissions_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_member" DROP CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_member" DROP CONSTRAINT "workspace_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_member" DROP CONSTRAINT "workspace_members_invited_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace" DROP CONSTRAINT "workspaces_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "database_property" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."database_property_type";--> statement-breakpoint
CREATE TYPE "public"."database_property_type" AS ENUM('title', 'text', 'number', 'select', 'multi_select', 'status', 'date', 'person', 'checkbox', 'url', 'email', 'phone', 'file', 'relation', 'rollup', 'formula', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by');--> statement-breakpoint
ALTER TABLE "database_property" ALTER COLUMN "type" SET DATA TYPE "public"."database_property_type" USING "type"::"public"."database_property_type";--> statement-breakpoint
DROP INDEX "blocks_page_id_parent_block_id_position_idx";--> statement-breakpoint
DROP INDEX "database_properties_database_id_name_key";--> statement-breakpoint
DROP INDEX "database_properties_database_id_position_idx";--> statement-breakpoint
DROP INDEX "database_views_database_id_position_idx";--> statement-breakpoint
DROP INDEX "databases_workspace_id_updated_at_idx";--> statement-breakpoint
DROP INDEX "files_workspace_id_created_at_idx";--> statement-breakpoint
DROP INDEX "page_property_values_workspace_id_idx";--> statement-breakpoint
DROP INDEX "pages_workspace_id_parent_page_id_idx";--> statement-breakpoint
DROP INDEX "pages_database_id_updated_at_idx";--> statement-breakpoint
DROP INDEX "permissions_workspace_id_subject_idx";--> statement-breakpoint
DROP INDEX "users_last_seen_at_idx";--> statement-breakpoint
DROP INDEX "workspace_members_user_id_status_idx";--> statement-breakpoint
DROP INDEX "workspaces_slug_key";--> statement-breakpoint
DROP INDEX "workspaces_owner_id_idx";--> statement-breakpoint
ALTER TABLE "page_property_value" DROP CONSTRAINT "page_property_values_page_id_property_id_pk";--> statement-breakpoint
ALTER TABLE "workspace_member" DROP CONSTRAINT "workspace_members_workspace_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_seen_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "page_property_value" ADD CONSTRAINT "page_property_value_page_id_property_id_pk" PRIMARY KEY("page_id","property_id");--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id");--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "synced_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_parent_block_id_fkey" FOREIGN KEY ("parent_block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_property" ADD CONSTRAINT "database_property_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_property" ADD CONSTRAINT "database_property_database_id_database_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."database"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_view" ADD CONSTRAINT "database_view_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_view" ADD CONSTRAINT "database_view_database_id_database_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."database"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_view" ADD CONSTRAINT "database_view_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database" ADD CONSTRAINT "database_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database" ADD CONSTRAINT "database_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_property_value" ADD CONSTRAINT "page_property_value_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_property_value" ADD CONSTRAINT "page_property_value_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_property_value" ADD CONSTRAINT "page_property_value_property_id_database_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."database_property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_database_id_database_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."database"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_parent_page_id_fkey" FOREIGN KEY ("parent_page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_database_id_database_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."database"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_page_id_parent_block_id_position_idx" ON "block" USING btree ("page_id","parent_block_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "database_property_database_id_name_key" ON "database_property" USING btree ("database_id","name");--> statement-breakpoint
CREATE INDEX "database_property_database_id_position_idx" ON "database_property" USING btree ("database_id","position");--> statement-breakpoint
CREATE INDEX "database_view_database_id_position_idx" ON "database_view" USING btree ("database_id","position");--> statement-breakpoint
CREATE INDEX "database_workspace_id_updated_at_idx" ON "database" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "file_workspace_id_created_at_idx" ON "file" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "page_property_value_workspace_id_idx" ON "page_property_value" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "page_workspace_id_parent_page_id_idx" ON "page" USING btree ("workspace_id","parent_page_id");--> statement-breakpoint
CREATE INDEX "page_database_id_updated_at_idx" ON "page" USING btree ("database_id","updated_at");--> statement-breakpoint
CREATE INDEX "permission_workspace_id_subject_idx" ON "permission" USING btree ("workspace_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "user_last_seen_at_idx" ON "users" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "user_external_user_id_idx" ON "users" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_lower_key" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "workspace_member_user_id_status_idx" ON "workspace_member" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspace_owner_id_idx" ON "workspace" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_size_check" CHECK ("file"."size" >= 0);--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_resource_check" CHECK (("permission"."page_id" is not null and "permission"."database_id" is null) or ("permission"."page_id" is null and "permission"."database_id" is not null));--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_subject_check" CHECK (("permission"."subject_type" = 'public' and "permission"."subject_id" is null) or ("permission"."subject_type" <> 'public' and "permission"."subject_id" is not null));