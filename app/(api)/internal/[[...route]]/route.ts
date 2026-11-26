import { handle } from "@hono/vercel"
import { Hono } from "hono"
import { http, httpError, httpNotFound, httpMethods } from "@/middlewares/http"
import { blocksRoutes } from "@/routes/blocks"
import { databasePropertiesRoutes } from "@/routes/database-properties"
import { databaseViewsRoutes } from "@/routes/database-views"
import { databasesRoutes } from "@/routes/databases"
import { documentsRoutes } from "@/routes/documents"
import { filesRoutes } from "@/routes/files"
import { pagePropertyValuesRoutes } from "@/routes/page-property-values"
import { pagesRoutes } from "@/routes/pages"
import { permissionsRoutes } from "@/routes/permissions"
import { resourceInteractionRoutes } from "@/routes/resource-interactions"
import { resourcePolicySyncRoutes } from "@/routes/resource-policy-sync"
import { taskEventsRoutes } from "@/routes/task-events"
import { usersRoutes } from "@/routes/users"
import { workManagementRoutes } from "@/routes/work-management"
import { workspaceMembersRoutes } from "@/routes/workspace-members"
import { workspaceMembershipRoutes } from "@/routes/workspace-membership"
import { workspacesRoutes } from "@/routes/workspaces"
import { sharedRoutes } from "@/routes/shared"
const router = new Hono()
router.use(http)
router.onError(httpError)
router.notFound(httpNotFound)
router.use(httpMethods(router))
router.route("/internal/task/workspace", workspaceMembershipRoutes)
router.route("/internal/task/workspace", workspacesRoutes)
router.route("/internal/task/workspace-member", workspaceMembersRoutes)
router.route("/internal/task/page", pagesRoutes)
router.route("/internal/task/document", documentsRoutes)
router.route("/internal/task", workManagementRoutes)
router.route("/internal/task/block", blocksRoutes)
router.route("/internal/task/database", databasesRoutes)
router.route("/internal/task/database-property", databasePropertiesRoutes)
router.route("/internal/task/page-property-value", pagePropertyValuesRoutes)
router.route("/internal/task/database-view", databaseViewsRoutes)
router.route("/internal/task/permission", permissionsRoutes)
router.route("/internal/task/file", filesRoutes)
router.route("/internal/task/user", usersRoutes)
router.route("/internal/task", resourceInteractionRoutes)
router.route("/internal/task/resource-policy", resourcePolicySyncRoutes)
router.route("/internal/task/event", taskEventsRoutes)
router.route("/internal", sharedRoutes)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const GET = handle(router)
export const HEAD = handle(router)
export const POST = handle(router)
export const PUT = handle(router)
export const PATCH = handle(router)
export const DELETE = handle(router)
export const OPTIONS = handle(router)
