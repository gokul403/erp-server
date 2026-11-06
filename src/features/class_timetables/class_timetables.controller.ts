import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { classTimetablesService } from "./class_timetables.service.js";

export class ClassTimetablesController {
  getTimetable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { classId, academicYear, term } = req.query;
      const schoolId = req.user?.school_id || "SCH-001";

      if (!classId && !academicYear && !term) {
        const timetables = await classTimetablesService.getAllTimetables(schoolId);
        res.json(timetables);
        return;
      }

      if (!classId || !academicYear || !term) {
        res.status(400).json({ error: "classId, academicYear, and term are required query parameters" });
        return;
      }

      const timetable = await classTimetablesService.getTimetable(
        classId as string,
        academicYear as string,
        term as string,
        schoolId
      );

      if (!timetable) {
        res.status(404).json({ error: "Timetable not found for specified query" });
        return;
      }

      res.json(timetable);
    } catch (error) {
      next(error);
    }
  };

  upsertTimetable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user?.school_id || "SCH-001";
      const timetable = await classTimetablesService.upsertTimetable(req.body, schoolId);
      res.json(timetable);
    } catch (error: any) {
      if (error.message && error.message.includes("already assigned")) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  deleteTimetable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { classId, academicYear, term } = req.body;
      const schoolId = req.user?.school_id || "SCH-001";

      if (!classId || !academicYear || !term) {
        res.status(400).json({ error: "classId, academicYear, and term are required" });
        return;
      }

      const deleted = await classTimetablesService.deleteTimetable(classId, academicYear, term, schoolId);
      res.json({ success: deleted });
    } catch (error) {
      next(error);
    }
  };

  getTeacherTimetables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.user?.id;
      const schoolId = req.user?.school_id || "SCH-001";

      if (!teacherId) {
        res.status(401).json({ error: "Unauthorized: Missing teacher identity context" });
        return;
      }

      const records = await classTimetablesService.getTeacherTimetables(teacherId, schoolId);
      res.json(records);
    } catch (error) {
      next(error);
    }
  };

  getTeacherTodaySchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.user?.id;
      const schoolId = req.user?.school_id || "SCH-001";
      const dateStr = req.query.date as string;

      console.log(`\n--- [DEBUG getTeacherTodaySchedule] ---`);
      console.log(`Teacher ID: ${teacherId}, Name: ${req.user?.name}, School: ${schoolId}`);
      console.log(`Requested Date: ${dateStr}`);

      if (!teacherId) {
        console.error("Unauthorized: Missing teacher identity context");
        res.status(401).json({ error: "Unauthorized: Missing teacher identity context" });
        return;
      }

      const timetables = await classTimetablesService.getTeacherTimetables(teacherId, schoolId);
      console.log(`Fetched timetables count: ${timetables.length}`);

      let dayName = "";
      if (dateStr) {
        const dateParts = dateStr.split("-");
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
          const day = parseInt(dateParts[2], 10);
          const date = new Date(year, month, day);
          dayName = date.toLocaleDateString("en-US", { weekday: "long" });
        } else {
          dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
        }
      } else {
        dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
      }

      console.log(`Parsed Day Name: ${dayName}`);

      const schedule: any[] = [];
      
      timetables.forEach((tt: any) => {
        const days: string[] = tt.days || [];
        const dayIndex = days.findIndex((d) => d.toLowerCase() === dayName.toLowerCase());
        
        console.log(`Timetable class_id: ${tt.class_id}, days: ${days.join(", ")}, matched dayIndex: ${dayIndex}`);
        
        if (dayIndex === -1) return;

        // Use the exactly matching teacher name from the database record (tt.teacher_name)
        // rather than relying on req.user.name which might be stale in the JWT token.
        const dbTeacherName = (tt.teacher_name || "").trim().toLowerCase();

        const periods: any[] = tt.periods || [];
        const slots: Record<string, any> = tt.slots || {};

        periods
          .filter((p: any) => !p.isBreak)
          .forEach((p: any) => {
            const key = `${days[dayIndex]}_${p.id}`;
            const slot = slots[key];
            
            console.log(`  Checking period ${p.id} (key: ${key}): slot teacher = '${slot?.teacher}'`);
            
            if (slot?.teacher && slot.teacher.trim().toLowerCase() === dbTeacherName) {
              console.log(`    -> MATCHED! Adding to schedule.`);
              schedule.push({
                classId: tt.class_id,
                className: tt.section ? `${tt.grade} - Section ${tt.section}` : tt.grade,
                grade: tt.grade,
                section: tt.section,
                periodId: p.id,
                periodName: p.name,
                subject: slot.subject,
                time: p.time,
                room: slot.room || "TBD",
              });
            }
          });
      });

      schedule.sort((a, b) => a.periodName.localeCompare(b.periodName));
      
      console.log(`Final schedule count: ${schedule.length}`);
      console.log(`--- [END DEBUG getTeacherTodaySchedule] ---\n`);

      res.json(schedule);
    } catch (error) {
      console.error("Error in getTeacherTodaySchedule:", error);
      next(error);
    }
  };
}

export const classTimetablesController = new ClassTimetablesController();
