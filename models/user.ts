import { eq } from "drizzle-orm"
import { getDatabase } from "@/database"
import {
  createCrudRepository,
  crudKey,
  CrudError,
  requireOwnedField,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { userTable } from "@/database/schema"
import { authUserSchema } from "@/schemas/database"
import { formatLocalUser } from "@/utils/formatter"

const repository = createCrudRepository(
  "user",
  {
    table: userTable,
    keys: [crudKey("id", userTable.id)],
    createFields: [
      "externalUserId",
      "name",
      "username",
      "email",
      "image",
      "metadata",
      "lastSeenAt",
    ],
    updateFields: [
      "name",
      "username",
      "email",
      "image",
      "metadata",
      "lastSeenAt",
    ],
    dateFields: ["lastSeenAt"],
    orderBy: userTable.createdAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) =>
      actor.isAdmin ? undefined : eq(userTable.id, actor.userId),
    read: (row, actor) => {
      if (!actor.isAdmin) requireOwnedField(row, "id", actor)
    },
    create: (_payload, actor) => {
      if (!actor.isAdmin)
        throw new CrudError(
          403,
          "forbidden",
          "Users are created through /auth/sync-user"
        )
    },
    mutate: (row, actor) => {
      if (!actor.isAdmin) requireOwnedField(row, "id", actor)
    },
  }
)

export async function rawGetUserByExternalId(externalUserId: string) {
  try {
    const [user] = await getDatabase()
      .select()
      .from(userTable)
      .where(eq(userTable.externalUserId, externalUserId))
      .limit(1)
    return user ?? null
  } catch (error) {
    throw error
  }
}

export async function rawSyncUser(rawInput: unknown) {
  try {
    const input = authUserSchema.parse(rawInput)
    const [existing] = await getDatabase()
      .select()
      .from(userTable)
      .where(eq(userTable.externalUserId, input.externalUserId))
      .limit(1)
    if (existing) {
      const [updated] = await getDatabase()
        .update(userTable)
        .set({
          externalUserId: input.externalUserId,
          name: input.name,
          username: input.username ?? existing.username,
          email: input.email,
          image: input.image === undefined ? existing.image : input.image,
          ssoStatus: input.status,
          lastSeenAt: new Date(),
          syncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, existing.id))
        .returning()
      return formatLocalUser(updated ?? existing)
    }
    const [created] = await getDatabase()
      .insert(userTable)
      .values({
        externalUserId: input.externalUserId,
        name: input.name,
        username: input.username ?? null,
        email: input.email,
        image: input.image ?? null,
        ssoStatus: input.status,
        lastSeenAt: new Date(),
        syncedAt: new Date(),
      })
      .returning()
    if (!created) throw new Error("user_create_failed")
    return formatLocalUser(created)
  } catch (error) {
    throw error
  }
}

export async function rawListUsers(actor: CrudActor, options?: CrudListOptions) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetUser(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreateUser(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function rawUpdateUser(
  actor: CrudActor,
  params: Record<string, string | undefined>,
  input: unknown
) {
  try {
    return await repository.update(actor, params, input)
  } catch (error) {
    throw error
  }
}
export async function rawDeleteUser(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}

export async function rawGetCurrentUser(actor: CrudActor) {
  const [user] = await getDatabase()
    .select()
    .from(userTable)
    .where(eq(userTable.id, actor.userId))
    .limit(1)
  if (!user) throw new CrudError(404, "user_not_found", "User not found")
  return formatLocalUser(user)
}
