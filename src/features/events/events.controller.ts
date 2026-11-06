import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { eventsService } from "./events.service.js";

export class EventsController {
  getEventsList = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user?.school_id || "SCH-001";
      const userId = req.user?.id || "";
      const role = req.user?.role || "";

      const {
        category,
        status,
        academic_year,
        grade,
        class_id,
        start_date,
        end_date,
        created_by,
        search
      } = req.query;

      const filters = {
        category: category as string,
        status: status as string,
        academic_year: academic_year as string,
        grade: grade as string,
        class_id: class_id as string,
        start_date: start_date as string,
        end_date: end_date as string,
        created_by: created_by as string,
        search: search as string
      };

      const events = await eventsService.getEventsList(schoolId, userId, role, filters);
      res.json(events);
    } catch (error) {
      next(error);
    }
  };

  getEventDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const schoolId = req.user?.school_id || "SCH-001";
      const userId = req.user?.id || "";
      const role = req.user?.role || "";

      if (!id) {
        res.status(400).json({ error: "Event ID param is required" });
        return;
      }

      const event = await eventsService.getEventDetails(id, schoolId, userId, role);
      res.json(event);
    } catch (error) {
      next(error);
    }
  };

  getTeacherDashboardEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.user?.id;
      const schoolId = req.user?.school_id || "SCH-001";

      if (!teacherId) {
        res.status(401).json({ error: "Unauthorized: Missing teacher context" });
        return;
      }

      const events = await eventsService.getTeacherDashboardEvents(teacherId, schoolId);
      res.json(events);
    } catch (error) {
      next(error);
    }
  };

  createEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user?.school_id || "SCH-001";
      const userId = req.user?.id || "";
      const role = req.user?.role || "";

      const event = await eventsService.createEvent(req.body, schoolId, userId, role);
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  };

  updateEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const schoolId = req.user?.school_id || "SCH-001";
      const userId = req.user?.id || "";
      const role = req.user?.role || "";

      if (!id) {
        res.status(400).json({ error: "Event ID param is required" });
        return;
      }

      const event = await eventsService.updateEvent(id, req.body, schoolId, userId, role);
      res.json(event);
    } catch (error) {
      next(error);
    }
  };

  deleteEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const schoolId = req.user?.school_id || "SCH-001";
      const userId = req.user?.id || "";
      const role = req.user?.role || "";

      if (!id) {
        res.status(400).json({ error: "Event ID param is required" });
        return;
      }

      const success = await eventsService.deleteEvent(id, schoolId, userId, role);
      res.json({ success });
    } catch (error) {
      next(error);
    }
  };

  publishEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const schoolId = req.user?.school_id || "SCH-001";
      const userId = req.user?.id || "";
      const role = req.user?.role || "";

      if (!id) {
        res.status(400).json({ error: "Event ID param is required" });
        return;
      }

      const success = await eventsService.publishEvent(id, schoolId, userId, role);
      res.json({ success });
    } catch (error) {
      next(error);
    }
  };

  archiveEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const schoolId = req.user?.school_id || "SCH-001";
      const userId = req.user?.id || "";
      const role = req.user?.role || "";

      if (!id) {
        res.status(400).json({ error: "Event ID param is required" });
        return;
      }

      const success = await eventsService.archiveEvent(id, schoolId, userId, role);
      res.json({ success });
    } catch (error) {
      next(error);
    }
  };
}
export const eventsController = new EventsController();
