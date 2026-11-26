import { Router } from "@/lib/http"
import {
  createUserController,
  deleteUserController,
  getCurrentUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from "@/controllers/users"
import { requireAuth } from "@/middlewares/auth"
export function usersRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listUsersController)
  router.post("/", requireAuth(), createUserController)
  router.get("/me", requireAuth(), getCurrentUserController)
  router.get("/:id", requireAuth(), getUserController)
  router.put("/:id", requireAuth(), updateUserController)
  router.patch("/:id", requireAuth(), updateUserController)
  router.delete("/:id", requireAuth(), deleteUserController)
  return router
}
