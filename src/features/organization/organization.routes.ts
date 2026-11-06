import { Router } from "express";
import { OrganizationController } from "./organization.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const organizationRouter = Router();
const controller = new OrganizationController();

organizationRouter.get("/", asyncHandler(controller.listOrganizations));
organizationRouter.post("/", asyncHandler(controller.createOrganization));
organizationRouter.put("/:id", asyncHandler(controller.updateOrganization));
organizationRouter.delete("/:id", asyncHandler(controller.deleteOrganization));
