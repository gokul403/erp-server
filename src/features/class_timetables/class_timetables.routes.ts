import { Router } from "express";
import { classTimetablesController } from "./class_timetables.controller.js";

const router = Router();

router.get("/teacher/today", classTimetablesController.getTeacherTodaySchedule);
router.get("/teacher", classTimetablesController.getTeacherTimetables);
router.get("/", classTimetablesController.getTimetable);
router.post("/", classTimetablesController.upsertTimetable);
router.post("/delete", classTimetablesController.deleteTimetable);

export { router as classTimetablesRouter };
