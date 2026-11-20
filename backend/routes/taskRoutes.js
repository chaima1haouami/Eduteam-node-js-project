import express from "express";
import { protect } from "../middleware/auth.js";
import { projectRole } from "../middleware/projectRole.js";
import { setManagerFlag } from "../middleware/taskAccess.js";
import {
  getMeta,
  createTask,
  listTasks,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

// mergeParams : pour lire :projectId défini dans server.js
const router = express.Router({ mergeParams: true });

// US28 : authentifié + membre du projet (projectRole() sans argument = tout membre)
router.use(protect, projectRole(), setManagerFlag);

router.get("/meta", getMeta); // avant "/:taskId"
router.route("/").get(listTasks).post(createTask);
router.route("/:taskId").patch(updateTask).delete(deleteTask);

export default router;