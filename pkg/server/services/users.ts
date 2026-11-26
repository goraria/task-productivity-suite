import { eq, or } from "drizzle-orm"
import { database } from "@/database"
import {
  createCrudRepository,
  crudKey,
  CrudError,
  requireOwnedField,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { userTable, type User } from "@/database/schema"
import { authUserSchema } from "@/schemas/database"

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

export async function getUserByExternalId(externalUserId: string) {
  try {
    const [user] = await database
      .select()
      .from(userTable)
      .where(eq(userTable.externalUserId, externalUserId))
      .limit(1)
    return user ?? null
  } catch (error) {
    throw error
  }
}

function serializeUser(user: User) {
  return {
    ...user,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    syncedAt: user.syncedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export async function syncUser(rawInput: unknown) {
  try {
    const input = authUserSchema.parse(rawInput)
    const [existing] = await database
      .select()
      .from(userTable)
      .where(
        or(
          eq(userTable.externalUserId, input.externalUserId),
          eq(userTable.email, input.email)
        )
      )
      .limit(1)
    if (existing) {
      const [updated] = await database
        .update(userTable)
        .set({
          externalUserId: input.externalUserId,
          name: input.name,
          username: input.username ?? existing.username,
          email: input.email,
          image: input.image === undefined ? existing.image : input.image,
          status: input.status,
          lastSeenAt: new Date(),
          syncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, existing.id))
        .returning()
      return serializeUser(updated ?? existing)
    }
    const [created] = await database
      .insert(userTable)
      .values({
        externalUserId: input.externalUserId,
        name: input.name,
        username: input.username ?? null,
        email: input.email,
        image: input.image ?? null,
        status: input.status,
        lastSeenAt: new Date(),
        syncedAt: new Date(),
      })
      .returning()
    if (!created) throw new Error("user_create_failed")
    return serializeUser(created)
  } catch (error) {
    throw error
  }
}

export async function listUsers(actor: CrudActor, options?: CrudListOptions) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getUser(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createUser(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updateUser(
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
export async function deleteUser(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
