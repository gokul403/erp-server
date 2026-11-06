import { Router } from "express";
import { FeeManagementController } from "./feemanagement.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const feemanagementRouter = Router();
const controller = new FeeManagementController();

feemanagementRouter.get("/", asyncHandler(controller.listAllocations));
feemanagementRouter.post("/", asyncHandler(controller.saveAllocations));
