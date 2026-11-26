import { Router } from "@/lib/http"
import { splat, syncUser } from "@/controllers/auth"
import { requireAuth } from "@/middlewares/auth"

const router = Router()

router.post("/sync-user", requireAuth({ freshProfile: true }), syncUser)
router.all("/*splat", splat)

export default router
