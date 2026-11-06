import { query } from "../../config/database/postgres.js";
import { classTimetablesRepository } from "./class_timetables.repository.js";
import { ClassTimetableRecord, UpsertClassTimetablePayload } from "./class_timetables.types.js";

export class ClassTimetablesService {
  public async getTimetable(
    classId: string,
    academicYear: string,
    term: string,
    schoolId: string
  ): Promise<ClassTimetableRecord | null> {
    if (!classId || !academicYear || !term) {
      throw new Error("Missing parameters for fetching timetable");
    }
    return classTimetablesRepository.getTimetable(classId, academicYear, term, schoolId);
  }

  public async getAllTimetables(schoolId: string): Promise<ClassTimetableRecord[]> {
    return classTimetablesRepository.getAllTimetables(schoolId);
  }

  public async upsertTimetable(
    payload: UpsertClassTimetablePayload,
    schoolId: string
  ): Promise<ClassTimetableRecord> {
    if (!payload.class_id || !payload.academic_year || !payload.term) {
      throw new Error("Class ID, Academic Year, and Term are required to save a timetable");
    }

    // 1. Fetch other published timetables in the same academic year
    const otherTimetablesRes = await query(
      `SELECT t.class_id, t.slots, t.periods, c.grade, c.section
       FROM class_timetables t
       JOIN classes c ON t.class_id = c.id
       WHERE t.academic_year = $1 
         AND t.status = 'Published'
         AND t.class_id != $2
         AND (t.school_id = $3 OR $3 = 'SCH-001')`,
      [payload.academic_year, payload.class_id, schoolId]
    );

    // 2. Iterate incoming slots to check for teacher conflicts
    const slots = payload.slots || {};
    const periods = payload.periods || [];

    for (const [key, slotData] of Object.entries(slots)) {
      const data = slotData as any;
      if (!data || !data.teacher || data.teacher.trim() === "") {
        continue;
      }
      
      const teacherName = data.teacher.trim();
      const [day, periodId] = key.split("-");

      // Skip break periods
      const periodDef = periods.find((p: any) => p.id === periodId);
      if (!periodDef || periodDef.isBreak) continue;
      
      const periodTime = periodDef.time || "";
      const periodName = periodDef.name || `Period ${periodId}`;

      // Check conflict against each other published timetable
      for (const row of otherTimetablesRes.rows) {
        const rowSlots = row.slots || {};
        const rowPeriods = row.periods || [];
        const rowSlot = rowSlots[key];

        if (rowSlot && rowSlot.teacher && rowSlot.teacher.trim() === teacherName) {
          const rowPeriodDef = rowPeriods.find((p: any) => p.id === periodId) || periodDef;
          const rowTime = rowPeriodDef.time || periodTime;
          const rowPeriodName = rowPeriodDef.name || periodName;
          
          throw new Error(
            `Teacher is already assigned to Class ${row.grade} - Section ${row.section || "A"} during ${rowPeriodName} (${rowTime}). Please select another teacher or change the period.`
          );
        }
      }
    }

    return classTimetablesRepository.upsertTimetable(payload, schoolId);
  }

  public async deleteTimetable(
    classId: string,
    academicYear: string,
    term: string,
    schoolId: string
  ): Promise<boolean> {
    if (!classId || !academicYear || !term) {
      throw new Error("Class ID, Academic Year, and Term are required to delete a timetable");
    }
    return classTimetablesRepository.deleteTimetable(classId, academicYear, term, schoolId);
  }

  public async getTeacherTimetables(
    teacherId: string,
    schoolId: string
  ): Promise<any[]> {
    if (!teacherId) {
      throw new Error("Teacher ID is required to fetch teacher timetable details");
    }
    return classTimetablesRepository.getTeacherTimetables(teacherId, schoolId);
  }
}
export const classTimetablesService = new ClassTimetablesService();
