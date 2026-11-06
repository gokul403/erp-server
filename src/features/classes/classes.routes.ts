import { Router } from "express";
import { ClassesController } from "./classes.controller.js";

const router = Router();
const controller = new ClassesController();

router.get("/", controller.listClasses);
router.post("/", controller.createClass);
router.put("/:id", controller.updateClass);
router.delete("/:id", controller.deleteClass);

export { router as classesRouter };
