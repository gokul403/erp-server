import { Router } from "express";
import { StaffController } from "./staff.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const staffRouter = Router();
const staffController = new StaffController();

staffRouter.get("/", asyncHandler(staffController.listStaff));
staffRouter.post("/", asyncHandler(staffController.createStaff));
staffRouter.put("/:id", asyncHandler(staffController.updateStaff));
staffRouter.delete("/:id", asyncHandler(staffController.deleteStaff));
