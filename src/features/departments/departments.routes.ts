import { Router } from "express";
import { DepartmentsController } from "./departments.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const departmentsRouter = Router();
const controller = new DepartmentsController();

departmentsRouter.get("/", asyncHandler(controller.listDepartments));
departmentsRouter.post("/", asyncHandler(controller.createDepartment));
departmentsRouter.put("/:id", asyncHandler(controller.updateDepartment));
departmentsRouter.delete("/:id", asyncHandler(controller.deleteDepartment));
