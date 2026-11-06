import { query } from "../../config/database/postgres.js";
import { ClassTimetableRecord, UpsertClassTimetablePayload } from "./class_timetables.types.js";

export class ClassTimetablesRepository {
  constructor() {
    this.ensureClassTimetablesTable();
  }

  private async ensureClassTimetablesTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS class_timetables (
          class_id VARCHAR(50) NOT NULL,
          academic_year VARCHAR(50) NOT NULL,
          term VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Draft',
          periods JSONB NOT NULL DEFAULT '[]'::jsonb,
          days JSONB NOT NULL DEFAULT '[]'::jsonb,
          slots JSONB NOT NULL DEFAULT '{}'::jsonb,
          school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (class_id, academic_year, term)
        )
      `);

      // Register stored procedure for fetching teacher timetables
      await query(`
        CREATE OR REPLACE FUNCTION get_teacher_timetables(p_teacher_id VARCHAR, p_school_id VARCHAR)
        RETURNS TABLE (
          class_id VARCHAR,
          academic_year VARCHAR,
          term VARCHAR,
          status VARCHAR,
          periods JSONB,
          days JSONB,
          slots JSONB,
          grade VARCHAR,
          section VARCHAR,
          class_teacher VARCHAR,
          teacher_name VARCHAR
        ) AS $$
        DECLARE
          v_teacher_name VARCHAR;
        BEGIN
          SELECT name INTO v_teacher_name FROM users WHERE id::text = p_teacher_id::text LIMIT 1;
          
          IF v_teacher_name IS NULL THEN
            RETURN;
          END IF;

          RETURN QUERY
          SELECT 
            t.class_id::VARCHAR,
            t.academic_year::VARCHAR,
            t.term::VARCHAR,
            t.status::VARCHAR,
            t.periods,
            t.days,
            t.slots,
            c.grade::VARCHAR,
            c.section::VARCHAR,
            c.teacher::VARCHAR as class_teacher,
            v_teacher_name::VARCHAR as teacher_name
          FROM class_timetables t
          JOIN classes c ON t.class_id = c.id
          WHERE t.status = 'Published'
            AND (t.school_id = p_school_id OR p_school_id = 'SCH-001')
            AND (
              c.teacher = v_teacher_name 
              OR EXISTS (
                SELECT 1 
                FROM jsonb_each(t.slots) AS slots_each(key, val)
                WHERE val->>'teacher' = v_teacher_name
              )
            );
        END;
        $$ LANGUAGE plpgsql;
      `);
    } catch (e) {
      console.error("Error creating class_timetables table or stored procedure:", e);
    }
  }

  public async getTeacherTimetables(
    teacherId: string,
    schoolId: string
  ): Promise<any[]> {
    const result = await query(
      `SELECT * FROM get_teacher_timetables($1, $2)`,
      [teacherId, schoolId]
    );
    return result.rows;
  }

  public async getTimetable(
    classId: string,
    academicYear: string,
    term: string,
    schoolId: string
  ): Promise<ClassTimetableRecord | null> {
    const result = await query(
      `SELECT * FROM class_timetables 
       WHERE class_id = $1 AND academic_year = $2 AND term = $3 AND (school_id = $4 OR $4 = 'SCH-001')`,
      [classId, academicYear, term, schoolId]
    );

    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0] as ClassTimetableRecord;
  }

  public async getAllTimetables(schoolId: string): Promise<ClassTimetableRecord[]> {
    const result = await query(
      `SELECT * FROM class_timetables WHERE school_id = $1 OR $1 = 'SCH-001'`,
      [schoolId]
    );
    return result.rows as ClassTimetableRecord[];
  }

  public async upsertTimetable(
    payload: UpsertClassTimetablePayload,
    schoolId: string
  ): Promise<ClassTimetableRecord> {
    // Stringify JSON payloads safely
    const periodsJson = JSON.stringify(payload.periods || []);
    const daysJson = JSON.stringify(payload.days || []);
    const slotsJson = JSON.stringify(payload.slots || {});
    const statusVal = payload.status || "Draft";

    const result = await query(
      `INSERT INTO class_timetables (class_id, academic_year, term, status, periods, days, slots, school_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
       ON CONFLICT (class_id, academic_year, term) DO UPDATE SET
         status = EXCLUDED.status,
         periods = EXCLUDED.periods,
         days = EXCLUDED.days,
         slots = EXCLUDED.slots,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        payload.class_id,
        payload.academic_year,
        payload.term,
        statusVal,
        periodsJson,
        daysJson,
        slotsJson,
        schoolId,
      ]
    );

    return result.rows[0] as ClassTimetableRecord;
  }

  public async deleteTimetable(
    classId: string,
    academicYear: string,
    term: string,
    schoolId: string
  ): Promise<boolean> {
    const result = await query(
      `DELETE FROM class_timetables 
       WHERE class_id = $1 AND academic_year = $2 AND term = $3 AND (school_id = $4 OR $4 = 'SCH-001')`,
      [classId, academicYear, term, schoolId]
    );

    return (result.rowCount ?? 0) > 0;
  }
}
export const classTimetablesRepository = new ClassTimetablesRepository();
