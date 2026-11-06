import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.js";
import { eventsController } from "./events.controller.js";

const router = Router();

router.use(authenticateToken as any);

router.get("/teacher-dashboard", eventsController.getTeacherDashboardEvents);
router.get("/", eventsController.getEventsList);
router.get("/:id", eventsController.getEventDetails);
router.post("/", eventsController.createEvent);
router.put("/:id", eventsController.updateEvent);
router.delete("/:id", eventsController.deleteEvent);
router.post("/:id/publish", eventsController.publishEvent);
router.post("/:id/archive", eventsController.archiveEvent);

export { router as eventsRouter };
