import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { listUsers, changeRole } from "../controllers/userController.js";

const router = Router();
router.use(protect, adminOnly);
router.get("/", listUsers);
router.patch("/:id/role", changeRole);
export default router;