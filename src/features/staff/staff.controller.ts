import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { StaffService } from "./staff.service.js";

export class StaffController {
  constructor(private readonly staffService = new StaffService()) {}

  listStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const staff = await this.staffService.getStaff(req.user);
      res.json(staff);
    } catch (error) {
      next(error);
    }
  };

  createStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const staff = await this.staffService.createStaff(req.body, req.user);
      res.status(201).json(staff);
    } catch (error) {
      next(error);
    }
  };

  updateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid staff id" });
        return;
      }

      const id = idParam as string;
      const staff = await this.staffService.updateStaff(id, req.body, req.user as any);
      res.json(staff);
    } catch (error) {
      next(error);
    }
  };

  deleteStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid staff id" });
        return;
      }
      await this.staffService.deleteStaff(idParam, req.user);
      res.json({ message: "Staff deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
}
