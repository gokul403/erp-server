import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { authenticateToken } from "../../middleware/auth.js";

export const authRouter = Router();
const authController = new AuthController();

authRouter.post("/login", asyncHandler(authController.login));
authRouter.get("/me", asyncHandler(authController.me));
authRouter.post("/change-password", authenticateToken, asyncHandler(authController.changePassword));
