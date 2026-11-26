import { listQuerySchema } from "@/schemas/productivity"
import {
  dependencySchema,
  issueSchema,
  issueStatuses,
  issueUpdateSchema,
  sprintActionSchema,
  sprintSchema,
} from "@/schemas/work-management"
import * as services from "@/models/work-item"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import { z } from "@gorth-com/structure/cores/zod"
import type { Context } from "hono"
export async function actListIssues(c: Context<ApiEnv>) {
  const q = listQuerySchema
    .extend({ status: z.enum(issueStatuses).optional() })
    .parse(c.req.query())
  return c.json(
    await services.rawListIssues(
      await resolveActor(c),
      z.uuid().parse(q.workspaceId),
      q.limit,
      q.offset,
      { search: q.search, status: q.status }
    ),
    200
  )
}
export async function actCreateIssue(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawCreateIssue(
        await resolveActor(c),
        issueSchema.parse(await c.req.json())
      ),
    },
    201
  )
}
export async function actUpdateIssue(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawUpdateIssue(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        issueUpdateSchema.parse(await c.req.json())
      ),
    },
    200
  )
}
export async function actAddDependency(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawAddDependency(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        dependencySchema.parse(await c.req.json()).dependsOnId
      ),
    },
    201
  )
}
export async function actListSprints(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawListSprints(
        await resolveActor(c),
        z.uuid().parse(c.req.query("workspaceId"))
      ),
    },
    200
  )
}
export async function actCreateSprint(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawCreateSprint(
        await resolveActor(c),
        sprintSchema.parse(await c.req.json())
      ),
    },
    201
  )
}
export async function actTransitionSprint(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawTransitionSprint(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        sprintActionSchema.parse(await c.req.json()).action
      ),
    },
    200
  )
}
export async function actWorkReport(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawWorkReport(
        await resolveActor(c),
        z.uuid().parse(c.req.query("workspaceId"))
      ),
    },
    200
  )
}

export async function actListDependencies(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await services.rawListDependencies(
        await resolveActor(context),
        z.uuid().parse(context.req.param("id"))
      ),
    },
    200
  )
}
export async function actRemoveDependency(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await services.rawRemoveDependency(
        await resolveActor(context),
        z.uuid().parse(context.req.param("id")),
        z.uuid().parse(context.req.param("dependencyId"))
      ),
    },
    200
  )
}
