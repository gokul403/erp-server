import { query } from "../../config/database/postgres.js";
import { ClassRecord, CreateClassPayload } from "./classes.types.js";

export class ClassesRepository {
  private async ensureClassesTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS classes (
          id VARCHAR(50) PRIMARY KEY,
          grade VARCHAR(100) NOT NULL,
          section VARCHAR(50),
          batch VARCHAR(100),
          academic_year VARCHAR(50) NOT NULL,
          campus VARCHAR(255) NOT NULL,
          code VARCHAR(50) NOT NULL,
          teacher VARCHAR(255),
          room VARCHAR(50),
          students_count INTEGER DEFAULT 0,
          school_id VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const checkEmpty = await query("SELECT COUNT(*) FROM classes");
      if (parseInt(checkEmpty.rows[0].count, 10) === 0) {
        const DEFAULT_CLASSES = [
          { id: "CL-01", grade: "Grade 10", section: "A", batch: "2026-2027 Batch", academicYear: "2026-2027", campus: "Main Campus", code: "G10-A", teacher: "Vikram Iyer", room: "R-101", students: 32 },
          { id: "CL-02", grade: "Grade 9", section: "B", batch: "2025-2026 Batch", academicYear: "2025-2026", campus: "North Campus", code: "G9-B", teacher: "Neha Aggarwal", room: "R-102", students: 28 },
          { id: "CL-03", grade: "Grade 11", section: "A", batch: "Science Batch", academicYear: "2026-2027", campus: "Main Campus", code: "G11-A", teacher: "Ravi Kumar", room: "R-105", students: 30 },
          { id: "CL-04", grade: "Class 5", section: "C", batch: "General Batch", academicYear: "2026-2027", campus: "South Campus", code: "C5-C", teacher: "Priya Sharma", room: "R-204", students: 25 },
        ];
        for (const c of DEFAULT_CLASSES) {
          await query(
            `INSERT INTO classes (id, grade, section, batch, academic_year, campus, code, teacher, room, students_count, school_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [c.id, c.grade, c.section, c.batch, c.academicYear, c.campus, c.code, c.teacher, c.room, c.students, "SCH-001"]
          );
        }
        console.log("Seeded default classes successfully.");
      }
    } catch (err) {
      console.error("Error in ensureClassesTable:", err);
    }
  }

  async listClasses(schoolId: string | null, isSuperAdmin: boolean): Promise<ClassRecord[]> {
    await this.ensureClassesTable();
    const sql = `
      SELECT * FROM classes
      WHERE school_id = $1 OR $2 = TRUE
      ORDER BY grade, section
    `;
    const result = await query(sql, [schoolId, isSuperAdmin]);
    return result.rows as ClassRecord[];
  }

  async createClass(payload: CreateClassPayload, schoolId: string): Promise<ClassRecord> {
    await this.ensureClassesTable();

    let classId = payload.id;
    if (!classId) {
      const idResult = await query("SELECT id FROM classes WHERE id LIKE 'CL-%'");
      let maxNum = 100;
      for (const row of idResult.rows) {
        const numPart = row.id.substring(3); // e.g. "01" from "CL-01"
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      classId = `CL-${maxNum + 1}`;
    }

    const result = await query(
      `INSERT INTO classes (id, grade, section, batch, academic_year, campus, code, teacher, room, students_count, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        classId,
        payload.grade,
        payload.section || null,
        payload.batch || null,
        payload.academic_year,
        payload.campus,
        payload.code,
        payload.teacher || null,
        payload.room || null,
        payload.students_count || 0,
        schoolId,
      ]
    );
    return result.rows[0] as ClassRecord;
  }

  async updateClass(id: string, payload: Partial<CreateClassPayload>, schoolId: string): Promise<ClassRecord> {
    await this.ensureClassesTable();

    const result = await query(
      `UPDATE classes SET
         grade = COALESCE($1, grade),
         section = COALESCE($2, section),
         batch = COALESCE($3, batch),
         academic_year = COALESCE($4, academic_year),
         campus = COALESCE($5, campus),
         code = COALESCE($6, code),
         teacher = COALESCE($7, teacher),
         room = COALESCE($8, room),
         students_count = COALESCE($9, students_count)
       WHERE id = $10 AND (school_id = $11 OR $11 = 'SCH-001')
       RETURNING *`,
      [
        payload.grade || null,
        payload.section === undefined ? undefined : (payload.section || null),
        payload.batch === undefined ? undefined : (payload.batch || null),
        payload.academic_year || null,
        payload.campus || null,
        payload.code || null,
        payload.teacher === undefined ? undefined : (payload.teacher || null),
        payload.room === undefined ? undefined : (payload.room || null),
        payload.students_count === undefined ? undefined : payload.students_count,
        id,
        schoolId,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Class not found or unauthorized");
    }

    return result.rows[0] as ClassRecord;
  }

  async deleteClass(id: string, schoolId: string): Promise<void> {
    await this.ensureClassesTable();

    const result = await query(
      `DELETE FROM classes WHERE id = $1 AND (school_id = $2 OR $2 = 'SCH-001')`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      throw new Error("Class not found or unauthorized");
    }
  }
}
