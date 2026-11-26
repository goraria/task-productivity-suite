import {
  isProduction,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/utils/environment"
import { createClient } from "@gorth/structure/cores/supabase/index"
// import type { Server as SocketIOServer } from "socket.io";
import { models } from "@/lib/constants"

let isRealtimeBootstrapped = false

export async function createRealtime() {
  if (isRealtimeBootstrapped) {
    return
  }

  isRealtimeBootstrapped = true

  const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
    global: {
      headers: {
        "User-Agent": "Hono-Server",
      },
    },
  })

  const channel = supabase.channel(`db-realtime`)

  models.forEach((table) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      (payload) => {
        if (payload.errors?.length) {
          console.error(
            `[Realtime] ${table} subscription error: ${payload.errors}`
          )
          return
        }

        console.log(`[Realtime] Change in ${table}: ${JSON.stringify(payload)}`)

        // Broadcast to all Socket.IO clients
        // io.emit("supabase", {
        //   table,
        //   data: payload,
        // });
      }
    )
  })

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log(`[Realtime] db channel status: ${status}`)
      return
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.error(`[Realtime] db channel status: ${status}`)
    }
  })
}
