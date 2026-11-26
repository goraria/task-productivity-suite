import { handle } from "@hono/vercel"
import { Hono } from "hono"
import { http, httpError, httpNotFound, httpMethods } from "@/middlewares/http"
import { taskEventsRoutes } from "@/routes/task-events"

const router = new Hono()
router.use(http)
router.onError(httpError)
router.notFound(httpNotFound)
router.use(httpMethods(router))
router.route("/task/event", taskEventsRoutes)

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const GET = handle(router)
export const HEAD = handle(router)
export const POST = handle(router)
export const OPTIONS = handle(router)
