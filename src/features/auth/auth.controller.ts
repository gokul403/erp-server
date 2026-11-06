import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  login = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const result = await this.authService.getCurrentUser(req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      const result = await this.authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        confirmNewPassword
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
