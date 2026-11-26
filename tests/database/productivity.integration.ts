import { getDatabase } from "@/database"
import { getAccessLevel } from "@/database/authorization"
import {
  blocksTable,
  documentRevisionsTable,
  documentPresenceTable,
  taskEventsTable,
  userTable,
  workItemsTable,
  workspaceMembersTable,
  workspacesTable,
} from "@/database/schema"
import { resourcePolicyGrantsQuery } from "@/schemas/resource-policy-sync"
import { rawCreateBlock, rawUpdateBlock } from "@/models/block"
import {
  rawCreateDatabaseProperty,
  rawUpdateDatabaseProperty,
} from "@/models/database-property"
import { rawListDatabaseRecords } from "@/models/page"
import { rawCreateDatabase } from "@/models/database"
import { rawAttachDocumentAsset } from "@/models/file"
import { rawDocumentPresence } from "@/models/document-presence"
import {
  rawExportDocument,
  rawGetPublishedDocument,
  rawImportDocument,
  rawRestoreDocumentRevision,
  rawSetDocumentAccessMode,
  rawSetDocumentPublication,
} from "@/models/document-revision"
import { rawCreatePagePropertyValue } from "@/models/page-property-value"
import { rawCreatePage, rawGetPage, rawListPages, rawUpdatePage } from "@/models/page"
import { rawCreatePermission, rawDeletePermission } from "@/models/permission"
import { rawDispatchTaskEvents } from "@/models/task-event-outbox"
import {
  rawAddDependency,
  rawCreateIssue,
  rawCreateSprint,
  rawListIssues,
  rawTransitionSprint,
  rawUpdateIssue,
} from "@/models/work-item"
import {
  rawRetryWorkspaceDelivery,
  rawWorkspaceDelivery,
} from "@/models/task-event-outbox"
import {
  rawLeaveWorkspace,
  rawTransferWorkspace,
} from "@/models/workspace-member"
import { and, eq, inArray } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { applyTaskMigration } from "./apply-migration"

const platform = vi.hoisted(() => ({
  request: vi.fn<
    (
      domain: string,
      path: string,
      method: string,
      body?: unknown
    ) => Promise<unknown>
  >(async () => ({})),
}))
vi.mock("@/services/platform-client", () => ({
  rawPlatformRequest: platform.request,
}))

describe("Task domain against the explicitly authorized cloud database", () => {
  const database = getDatabase()
  const ids = {
    owner: randomUUID(),
    member: randomUUID(),
    guest: randomUUID(),
    outsider: randomUUID(),
    workspace: randomUUID(),
    otherWorkspace: randomUUID(),
  }
  const actor = (role: "owner" | "member" | "guest" | "outsider") => ({
    userId: ids[role],
    isAdmin: false,
  })
  const tag = randomUUID()
  beforeAll(async () => {
    await applyTaskMigration()
    await database.insert(userTable).values(
      ["owner", "member", "guest", "outsider"].map((role) => ({
        id: ids[role as "owner"],
        externalUserId: `task-vitest:${tag}:${role}`,
        email: `task-vitest-${tag}-${role}@example.invalid`,
        name: `Vitest ${role}`,
      }))
    )
    await database.insert(workspacesTable).values([
      {
        id: ids.workspace,
        ownerId: ids.owner,
        name: "Vitest only",
        slug: `vitest-${tag}`,
      },
      {
        id: ids.otherWorkspace,
        ownerId: ids.outsider,
        name: "Vitest other",
        slug: `vitest-other-${tag}`,
      },
    ])
    await database.insert(workspaceMembersTable).values([
      { workspaceId: ids.workspace, userId: ids.member, role: "member" },
      { workspaceId: ids.workspace, userId: ids.guest, role: "guest" },
    ])
  })
  afterAll(async () => {
    await database
      .delete(workspacesTable)
      .where(inArray(workspacesTable.id, [ids.workspace, ids.otherWorkspace]))
    await database
      .delete(taskEventsTable)
      .where(
        inArray(taskEventsTable.workspaceId, [
          ids.workspace,
          ids.otherWorkspace,
        ])
      )
    await database
      .delete(userTable)
      .where(
        inArray(userTable.id, [ids.owner, ids.member, ids.guest, ids.outsider])
      )
  })

  it("enforces guest/viewer writes and grant management", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Restricted",
    })
    expect(await getAccessLevel("page", String(page.id), actor("guest"))).toBe(
      1
    )
    await expect(
      rawUpdatePage(
        actor("guest"),
        { id: String(page.id) },
        { title: "forged", version: 1 }
      )
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      rawCreatePermission(actor("member"), {
        workspaceId: ids.workspace,
        pageId: page.id,
        subjectType: "user",
        subjectId: ids.member,
        level: "full_access",
      })
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      rawGetPage(actor("outsider"), { id: String(page.id) })
    ).rejects.toMatchObject({ status: 403 })
  })

  it("applies private ancestor rules to list and detail", async () => {
    const parent = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Private parent",
    })
    const child = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      parentPageId: parent.id,
      title: "Private child",
    })
    await rawSetDocumentAccessMode(actor("owner"), String(parent.id), "restricted")
    await rawCreatePermission(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: parent.id,
      subjectType: "user",
      subjectId: ids.owner,
      level: "full_access",
    })
    await expect(
      rawGetPage(actor("member"), { id: String(child.id) })
    ).rejects.toMatchObject({ status: 403 })
    expect(
      (
        await rawListPages(actor("member"), {
          workspaceId: ids.workspace,
          limit: 100,
        })
      ).data.some((page) => page.id === child.id)
    ).toBe(false)
    await rawCreatePermission(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: parent.id,
      subjectType: "user",
      subjectId: ids.guest,
      level: "view",
    })
    expect(await getAccessLevel("page", String(child.id), actor("guest"))).toBe(
      1
    )
  })

  it("rejects cross-workspace references and hierarchy cycles", async () => {
    const other = await rawCreatePage(actor("outsider"), {
      workspaceId: ids.otherWorkspace,
      title: "Other",
    })
    await expect(
      rawCreateBlock(actor("owner"), {
        workspaceId: ids.workspace,
        pageId: other.id,
        content: { text: "bad" },
      })
    ).rejects.toMatchObject({ status: 403 })
    const parent = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Parent",
    })
    const child = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      parentPageId: parent.id,
      title: "Child",
    })
    await expect(
      rawUpdatePage(
        actor("owner"),
        { id: String(parent.id) },
        { parentPageId: child.id, version: 1 }
      )
    ).rejects.toMatchObject({ code: "hierarchy_cycle" })
  })

  it("prevents concurrent overwrite and restores a revision as a new version", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Original",
    })
    const outcomes = await Promise.allSettled([
      rawUpdatePage(
        actor("owner"),
        { id: String(page.id) },
        { title: "A", version: 1 }
      ),
      rawUpdatePage(
        actor("owner"),
        { id: String(page.id) },
        { title: "B", version: 1 }
      ),
    ])
    expect(
      outcomes.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1)
    expect(
      outcomes.filter((result) => result.status === "rejected")
    ).toHaveLength(1)
    const [revision] = await database
      .select()
      .from(documentRevisionsTable)
      .where(eq(documentRevisionsTable.pageId, String(page.id)))
    const restored = await rawRestoreDocumentRevision(
      actor("owner"),
      String(page.id),
      revision!.id,
      2
    )
    expect(restored).toMatchObject({ title: "Original", version: 3 })
  })

  it("persists todo metadata and exports/imports structured content", async () => {
    const page = await rawImportDocument(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Imported",
      blocks: [
        {
          type: "todo",
          content: { text: "Test", checked: false, color: "blue" },
        },
      ],
    })
    const [block] = await database
      .select()
      .from(blocksTable)
      .where(eq(blocksTable.pageId, page.id))
    const updated = await rawUpdateBlock(
      actor("owner"),
      { id: block!.id },
      { content: { text: "Test", checked: true, color: "blue" }, version: 1 }
    )
    expect(updated).toMatchObject({
      version: 2,
      content: { checked: true, color: "blue" },
    })
    const exported = await rawExportDocument(actor("owner"), page.id)
    expect(exported.blocks[0]?.content).toMatchObject({
      checked: true,
      color: "blue",
    })
  })

  it("serves only explicitly published documents and revokes public reads", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Published",
    })
    await expect(rawGetPublishedDocument(String(page.id))).rejects.toMatchObject({
      status: 404,
    })
    await expect(
      rawUpdatePage(
        actor("owner"),
        { id: page.id },
        { isPublished: true, version: page.version }
      )
    ).rejects.toMatchObject({ code: "sharing_action_required" })
    await rawSetDocumentPublication(actor("owner"), String(page.id), true)
    expect(await rawGetPublishedDocument(String(page.id))).toMatchObject({
      title: "Published",
    })
    await rawSetDocumentPublication(actor("owner"), String(page.id), false)
    await expect(rawGetPublishedDocument(String(page.id))).rejects.toMatchObject({
      status: 404,
    })
  })

  it("validates issue transitions, dependency cycles and sprint lifecycle", async () => {
    const first = await rawCreateIssue(actor("owner"), {
      workspaceId: ids.workspace,
      title: "First",
      kind: "task",
      status: "backlog",
      priority: "medium",
    })
    const second = await rawCreateIssue(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Second",
      kind: "bug",
      status: "backlog",
      priority: "high",
    })
    await rawAddDependency(actor("owner"), second.pageId!, first.pageId!)
    await expect(
      rawAddDependency(actor("owner"), first.pageId!, second.pageId!)
    ).rejects.toMatchObject({ code: "dependency_cycle" })
    await expect(
      rawUpdateIssue(actor("owner"), first.pageId!, { version: 1, status: "done" })
    ).rejects.toMatchObject({ code: "invalid_transition" })
    const sprint = await rawCreateSprint(actor("owner"), {
      workspaceId: ids.workspace,
      name: "Sprint 1",
    })
    expect(
      await rawTransitionSprint(actor("owner"), sprint!.id, "start")
    ).toMatchObject({ status: "active" })
    expect(
      await rawTransitionSprint(actor("owner"), sprint!.id, "complete")
    ).toMatchObject({ status: "completed" })
    expect(
      (await rawListIssues(actor("owner"), ids.workspace, 20, 0)).data.length
    ).toBeGreaterThanOrEqual(2)
  })
  it("retains restricted access after the last grant is revoked and accepts workspace grants", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Explicit grants",
      accessMode: "restricted",
    })
    const grant = await rawCreatePermission(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: page.id,
      subjectType: "user",
      subjectId: ids.member,
      level: "edit",
    })
    expect(await getAccessLevel("page", page.id, actor("member"))).toBe(3)
    await rawDeletePermission(actor("owner"), { id: String(grant.id) })
    expect(await getAccessLevel("page", page.id, actor("member"))).toBe(0)
    await rawCreatePermission(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: page.id,
      subjectType: "workspace",
      subjectId: ids.workspace,
      level: "view",
    })
    expect(await getAccessLevel("page", page.id, actor("member"))).toBe(1)
    await expect(
      rawCreatePermission(actor("owner"), {
        workspaceId: ids.workspace,
        pageId: page.id,
        subjectType: "user",
        subjectId: ids.outsider,
        level: "view",
      })
    ).rejects.toMatchObject({ code: "invalid_grant_subject" })
  })

  it("calculates formula/rollup before filtering and pagination, excluding private related pages", async () => {
    const db = await rawCreateDatabase(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Computed test",
    })
    const property = async (name: string, type: string, config = {}) =>
      rawCreateDatabaseProperty(actor("owner"), {
        workspaceId: ids.workspace,
        databaseId: db.id,
        name,
        type,
        config,
      })
    const amount = await property("Amount", "number")
    const relation = await property("Related", "relation")
    const double = await property("Double", "formula", {
      expression: { op: "multiply", args: [{ property: amount.id }, 2] },
    })
    const rollup = await property("Sum", "rollup", {
      relationPropertyId: relation.id,
      targetPropertyId: amount.id,
      operation: "sum",
    })
    const first = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      databaseId: db.id,
      title: "One",
    })
    const second = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      databaseId: db.id,
      title: "Two",
      accessMode: "restricted",
    })
    const value = async (pageId: string, propertyId: unknown, raw: unknown) =>
      rawCreatePagePropertyValue(actor("owner"), {
        workspaceId: ids.workspace,
        pageId,
        propertyId,
        value: { value: raw },
      })
    await value(first.id, amount.id, 10)
    await value(second.id, amount.id, 30)
    await value(first.id, relation.id, [second.id])
    const filtered = await rawListDatabaseRecords(actor("owner"), String(db.id), {
      filterPropertyId: String(double.id),
      filterValue: "60",
      limit: 1,
      offset: 0,
    })
    expect(filtered.pagination.total).toBe(1)
    expect(filtered.data[0]?.id).toBe(second.id)
    const sorted = await rawListDatabaseRecords(actor("owner"), String(db.id), {
      sortPropertyId: String(double.id),
      direction: "desc",
      limit: 1,
    })
    expect(sorted.data[0]?.id).toBe(second.id)
    const ownerRows = await rawListDatabaseRecords(
      actor("owner"),
      String(db.id),
      {}
    )
    expect(
      ownerRows.values.find(
        (row) => row.pageId === first.id && row.propertyId === rollup.id
      )?.value
    ).toEqual({ value: 30 })
    const memberRows = await rawListDatabaseRecords(
      actor("member"),
      String(db.id),
      {}
    )
    expect(
      memberRows.values.find(
        (row) => row.pageId === first.id && row.propertyId === rollup.id
      )?.value
    ).toEqual({ value: null })
    await expect(
      rawUpdateDatabaseProperty(
        actor("owner"),
        { id: String(double.id) },
        { config: { expression: { property: double.id } } }
      )
    ).rejects.toMatchObject({ code: "formula_cycle" })
  })

  it("archives/restores documents and rejects nested block cycles", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Archive test",
    })
    const parent = await rawCreateBlock(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: page.id,
      content: { text: "Parent" },
    })
    const child = await rawCreateBlock(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: page.id,
      parentBlockId: parent.id,
      content: { text: "Child" },
    })
    await expect(
      rawUpdateBlock(
        actor("owner"),
        { id: parent.id },
        { parentBlockId: child.id, version: 1 }
      )
    ).rejects.toMatchObject({ code: "hierarchy_cycle" })
    await rawUpdatePage(
      actor("owner"),
      { id: page.id },
      { isArchived: true, version: 1 }
    )
    expect(
      (
        await rawListPages(actor("owner"), { workspaceId: ids.workspace })
      ).data.some((row) => row.id === page.id)
    ).toBe(false)
    expect(
      (
        await rawListPages(actor("owner"), {
          workspaceId: ids.workspace,
          isArchived: true,
        })
      ).data.some((row) => row.id === page.id)
    ).toBe(true)
    await rawUpdatePage(
      actor("owner"),
      { id: page.id },
      { isArchived: false, version: 2 }
    )
    expect(await rawGetPage(actor("owner"), { id: page.id })).toMatchObject({
      isArchived: false,
      version: 3,
    })
  })

  it("retries a failed platform delivery without acknowledging it or leaking private content", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Private worker document",
      accessMode: "restricted",
    })
    // Only this test's generated workspace fixtures are removed, never other outbox rows.
    await database
      .delete(taskEventsTable)
      .where(eq(taskEventsTable.workspaceId, ids.workspace))
    const [event] = await database
      .insert(taskEventsTable)
      .values({
        workspaceId: ids.workspace,
        pageId: page.id,
        actorId: ids.owner,
        type: "page.changed",
        payload: { revision: 1 },
      })
      .returning()
    platform.request.mockRejectedValueOnce(new Error("simulated outage"))
    expect(await rawDispatchTaskEvents(ids.workspace)).toEqual({
      claimed: 1,
      delivered: 0,
      failed: 1,
    })
    expect(
      platform.request.mock.calls.some((call) => call[0] === "insight")
    ).toBe(true)
    const [failed] = await database
      .select()
      .from(taskEventsTable)
      .where(eq(taskEventsTable.id, event!.id))
    expect(failed).toMatchObject({
      deliveredAt: null,
      leaseToken: null,
      attempts: 1,
    })
    await database
      .update(taskEventsTable)
      .set({ availableAt: new Date(0) })
      .where(eq(taskEventsTable.id, event!.id))
    platform.request.mockClear()
    expect(await rawDispatchTaskEvents(ids.workspace)).toEqual({
      claimed: 1,
      delivered: 1,
      failed: 0,
    })
    const discovery = platform.request.mock.calls.find(
      (call) => call[0] === "discovery"
    )
    expect(discovery?.[3]).toMatchObject([{ operation: "delete" }])
    expect(JSON.stringify(platform.request.mock.calls)).not.toContain(
      "Private worker document"
    )
  })

  it("recomputes discovery state and stable cursor after publication is revoked", async () => {
    const parent = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Index parent",
    })
    const child = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      parentPageId: parent.id,
      title: "Published child",
    })
    await rawSetDocumentPublication(actor("owner"), child.id, true)
    await database
      .delete(taskEventsTable)
      .where(eq(taskEventsTable.workspaceId, ids.workspace))
    await database.insert(taskEventsTable).values({
      workspaceId: ids.workspace,
      pageId: child.id,
      actorId: ids.owner,
      type: "page.changed",
      payload: { revision: 1 },
    })
    platform.request.mockClear()
    await rawDispatchTaskEvents(ids.workspace)
    const published = platform.request.mock.calls.find(
      (call) => call[0] === "discovery"
    )?.[3] as { id: string; revision: number; operation: string }[]
    expect(published[0]?.operation).toBe("upsert")
    const currentParent = await rawGetPage(actor("owner"), { id: parent.id })
    await rawUpdatePage(
      actor("owner"),
      { id: parent.id },
      { isArchived: true, version: currentParent.version }
    )
    await expect(rawGetPublishedDocument(child.id)).rejects.toMatchObject({
      status: 404,
    })
    platform.request.mockClear()
    await rawDispatchTaskEvents(ids.workspace)
    const revoked = platform.request.mock.calls
      .filter((call) => call[0] === "discovery")
      .flatMap(
        (call) =>
          call[3] as {
            id: string
            resourceId: string
            revision: number
            operation: string
          }[]
      )
      .find((event) => event.resourceId === child.id)
    expect(revoked?.operation).toBe("delete")
    expect(revoked?.revision).toBeGreaterThan(published[0]!.revision)
    expect(revoked?.id).not.toBe(published[0]?.id)
  })

  it("uses identical effective grants for Resource comments and document access", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Resource grant",
      accessMode: "restricted",
    })
    const grant = await rawCreatePermission(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: page.id,
      subjectType: "user",
      subjectId: ids.guest,
      level: "comment",
    })
    const before = await database.execute<{
      pageId: string
      subject: string
      comment: boolean
    }>(resourcePolicyGrantsQuery)
    expect(
      before.find(
        (row) =>
          row.pageId === page.id && row.subject === `task-vitest:${tag}:guest`
      )
    ).toMatchObject({ comment: true })
    await rawDeletePermission(actor("owner"), { id: grant.id })
    const after = await database.execute<{
      pageId: string
      subject: string
      comment: boolean
    }>(resourcePolicyGrantsQuery)
    expect(
      after.find(
        (row) =>
          row.pageId === page.id && row.subject === `task-vitest:${tag}:guest`
      )
    ).toBeUndefined()
  })

  it("binds only ready page-owned Media assets and deduplicates concurrent attachments", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Attachment",
    })
    const assetId = randomUUID()
    const asset = {
      id: assetId,
      application: "task",
      resourceType: "page",
      resourceId: page.id,
      status: "ready",
      originalFilename: "test.txt",
      mimeType: "text/plain",
      bytes: 10,
    }
    platform.request.mockResolvedValue(asset)
    const bindings = await Promise.all([
      rawAttachDocumentAsset(
        actor("owner"),
        "fixture-user-token",
        page.id,
        assetId
      ),
      rawAttachDocumentAsset(
        actor("member"),
        "fixture-user-token",
        page.id,
        assetId
      ),
    ])
    expect(bindings[0]?.id).toBe(bindings[1]?.id)
    expect(bindings[0]?.url).toBe(
      `/task/document/${page.id}/attachment/${assetId}`
    )
    platform.request.mockResolvedValue({ ...asset, resourceId: randomUUID() })
    await expect(
      rawAttachDocumentAsset(
        actor("owner"),
        "fixture-user-token",
        page.id,
        assetId
      )
    ).rejects.toMatchObject({ code: "invalid_attachment" })
    platform.request.mockResolvedValue({})
  })

  it("serializes opposing hierarchy moves and cannot form a page cycle", async () => {
    const a = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Concurrent A",
    })
    const b = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Concurrent B",
    })
    const results = await Promise.allSettled([
      rawUpdatePage(
        actor("owner"),
        { id: a.id },
        { parentPageId: b.id, version: 1 }
      ),
      rawUpdatePage(
        actor("owner"),
        { id: b.id },
        { parentPageId: a.id, version: 1 }
      ),
    ])
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === "rejected")
    ).toHaveLength(1)
  })

  it("expires presence and removes viewers whose document access was revoked", async () => {
    const page = await rawCreatePage(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Presence",
      accessMode: "restricted",
    })
    expect(await rawDocumentPresence(actor("owner"), page.id)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ids.owner })])
    )
    await expect(
      rawDocumentPresence(actor("guest"), page.id)
    ).rejects.toMatchObject({ status: 403 })
    const grant = await rawCreatePermission(actor("owner"), {
      workspaceId: ids.workspace,
      pageId: page.id,
      subjectType: "user",
      subjectId: ids.guest,
      level: "view",
    })
    await rawDocumentPresence(actor("guest"), page.id)
    await database
      .update(documentPresenceTable)
      .set({ lastSeenAt: new Date(0) })
      .where(
        and(
          eq(documentPresenceTable.pageId, page.id),
          eq(documentPresenceTable.userId, ids.guest)
        )
      )
    expect(
      (await rawDocumentPresence(actor("owner"), page.id)).some(
        (member) => member.id === ids.guest
      )
    ).toBe(false)
    await rawDocumentPresence(actor("guest"), page.id)
    await rawDeletePermission(actor("owner"), { id: grant.id })
    expect(
      (await rawDocumentPresence(actor("owner"), page.id)).some(
        (member) => member.id === ids.guest
      )
    ).toBe(false)
  })

  it("executes an automation once despite retry and exposes delivery only to managers", async () => {
    const ruleId = randomUUID()
    await database
      .update(workspacesTable)
      .set({
        settings: {
          automations: [
            {
              id: ruleId,
              name: "Triage",
              event: "issue.created",
              enabled: true,
              whenStatus: "backlog",
              action: { kind: "set_status", status: "todo" },
            },
          ],
        },
      })
      .where(eq(workspacesTable.id, ids.workspace))
    await database
      .delete(taskEventsTable)
      .where(eq(taskEventsTable.workspaceId, ids.workspace))
    const issue = await rawCreateIssue(actor("owner"), {
      workspaceId: ids.workspace,
      title: "Automated",
      kind: "task",
      status: "backlog",
      priority: "medium",
    })
    const [source] = await database
      .select()
      .from(taskEventsTable)
      .where(
        and(
          eq(taskEventsTable.pageId, issue.pageId!),
          eq(taskEventsTable.type, "issue.created")
        )
      )
    await rawDispatchTaskEvents(ids.workspace)
    const [updated] = await database
      .select()
      .from(workItemsTable)
      .where(eq(workItemsTable.pageId, issue.pageId!))
    expect(updated?.status).toBe("todo")
    await database
      .update(taskEventsTable)
      .set({ deliveredAt: null, availableAt: new Date(0) })
      .where(eq(taskEventsTable.id, source!.id))
    for (let index = 0; index < 3; index++)
      await rawDispatchTaskEvents(ids.workspace)
    const doc = await rawGetPage(actor("owner"), { id: issue.pageId! })
    expect(doc.version).toBe(2)
    await expect(
      rawWorkspaceDelivery(actor("guest"), ids.workspace, 20, 0)
    ).rejects.toMatchObject({ status: 403 })
    expect(
      (await rawWorkspaceDelivery(actor("owner"), ids.workspace, 20, 0)).data
        .length
    ).toBeGreaterThan(0)
    await expect(
      rawRetryWorkspaceDelivery(actor("owner"), ids.workspace, source!.id)
    ).rejects.toMatchObject({ code: "delivery_not_retryable" })
    await database
      .update(workspacesTable)
      .set({ settings: {} })
      .where(eq(workspacesTable.id, ids.workspace))
  })

  it("keeps durable discovery tombstones when a workspace is deleted", async () => {
    await database
      .delete(taskEventsTable)
      .where(eq(taskEventsTable.workspaceId, ids.otherWorkspace))
    await database
      .delete(workspacesTable)
      .where(eq(workspacesTable.id, ids.otherWorkspace))
    const events = await database
      .select()
      .from(taskEventsTable)
      .where(eq(taskEventsTable.workspaceId, ids.otherWorkspace))
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((event) => event.type === "page.deleted")).toBe(true)
    platform.request.mockClear()
    await rawDispatchTaskEvents(ids.otherWorkspace)
    const calls = platform.request.mock.calls.filter(
      (call) => call[0] === "discovery"
    )
    expect(calls.length).toBeGreaterThan(0)
    expect(
      calls.every((call) =>
        (call[3] as { operation: string }[]).every(
          (event) => event.operation === "delete"
        )
      )
    ).toBe(true)
  })

  it("requires owner transfer before leaving and preserves the new owner", async () => {
    await expect(
      rawLeaveWorkspace(actor("owner"), ids.workspace)
    ).rejects.toMatchObject({ code: "owner_cannot_leave" })
    await expect(
      rawTransferWorkspace(actor("guest"), ids.workspace, ids.member)
    ).rejects.toMatchObject({ status: 403 })
    expect(
      await rawTransferWorkspace(actor("owner"), ids.workspace, ids.member)
    ).toMatchObject({ ownerId: ids.member })
    expect(
      await getAccessLevel("workspace", ids.workspace, actor("member"))
    ).toBe(4)
    await rawTransferWorkspace(actor("member"), ids.workspace, ids.owner)
  })
})
