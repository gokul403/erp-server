import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { DepartmentsService } from "./departments.service.js";

export class DepartmentsController {
  constructor(private readonly service = new DepartmentsService()) {}

  listDepartments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departments = await this.service.getDepartments(req.user);
      res.json(departments);
    } catch (error) {
      next(error);
    }
  };

  createDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const department = await this.service.createDepartment(req.body, req.user);
      res.status(201).json(department);
    } catch (error) {
      next(error);
    }
  };

  updateDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid department id" });
        return;
      }
      const department = await this.service.updateDepartment(idParam, req.body, req.user);
      res.json(department);
    } catch (error) {
      next(error);
    }
  };

  deleteDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid department id" });
        return;
      }
      await this.service.deleteDepartment(idParam, req.user);
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
}
