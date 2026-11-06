import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { ClassesService } from "./classes.service.js";

export class ClassesController {
  constructor(private readonly service = new ClassesService()) {}

  listClasses = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const classesList = await this.service.getClasses(req.user);
      res.json(classesList);
    } catch (error) {
      next(error);
    }
  };

  createClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const classRecord = await this.service.createClass(req.body, req.user);
      res.status(201).json(classRecord);
    } catch (error) {
      next(error);
    }
  };

  updateClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid class id" });
        return;
      }
      const classRecord = await this.service.updateClass(idParam, req.body, req.user);
      res.json(classRecord);
    } catch (error) {
      next(error);
    }
  };

  deleteClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid class id" });
        return;
      }
      await this.service.deleteClass(idParam, req.user);
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
}
