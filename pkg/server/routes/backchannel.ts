import { sql } from "drizzle-orm"
import { Hono } from "hono"

import { database } from "@/database"
import { verifyBackchannelLogoutToken } from "@/services/sso"

const router = new Hono()

router.post("/backchannel-logout", async (context) => {
  const body = await context.req.parseBody()
  const logoutToken = body.logout_token
  if (typeof logoutToken !== "string" || !logoutToken) {
    return context.json({ error: "missing_logout_token" }, 400)
  }

  try {
    const token = await verifyBackchannelLogoutToken(logoutToken)
    await database.transaction(async (transaction) => {
      await transaction.execute(sql`
        DELETE FROM "revocation" WHERE "expires_at" <= NOW()
      `)
      await transaction.execute(sql`
        INSERT INTO "revocation"
          ("jti", "sid", "subject", "expires_at")
        VALUES (${token.jti}, ${token.sid}, ${token.sub}, ${token.expiresAt})
        ON CONFLICT ("jti") DO NOTHING
      `)
    })
    return context.body(null, 200)
  } catch (error) {
    console.error("[backchannel-logout] invalid token", error)
    return context.json({ error: "invalid_logout_token" }, 400)
  }
})

export default router
