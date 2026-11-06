import { Router, Response } from "express";
import { query } from "../../config/database/postgres.js";
import { AuthenticatedRequest } from "../../middleware/auth.js";

export const attendanceRouter = Router();

// Ensure attendance table exists
async function ensureAttendanceTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
        class_name VARCHAR(100) NOT NULL,
        academic_date DATE NOT NULL,
        period VARCHAR(50) DEFAULT 'Period 4',
        student_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(255),
        roll INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
        marked_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_student_attendance UNIQUE (school_id, class_name, academic_date, period, student_id)
      );
    `);
  } catch (err) {
    console.error("Error creating attendance table:", err);
  }
}

// Auto run check on module load
ensureAttendanceTable();

/**
 * GET /api/attendance/check
 * Check if attendance records already exist for the selected class, date, period
 * Query Params: class_name, date, period
 */
attendanceRouter.get("/check", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const school_id = req.user?.school_id || "SCH-001";
  const className = (req.query.class_name as string) || "";
  const dateStr = (req.query.date as string) || "";
  const period = (req.query.period as string) || "";

  if (!className || !dateStr || !period) {
    res.status(400).json({ error: "class_name, date, and period are required parameters" });
    return;
  }

  try {
    const result = await query(
      `SELECT * FROM attendance 
       WHERE school_id = $1 AND class_name = $2 AND academic_date = $3 AND period = $4
       ORDER BY roll ASC, student_name ASC`,
      [school_id, className, dateStr, period]
    );

    const exists = result.rows.length > 0;
    res.json({
      exists,
      count: result.rows.length,
      records: result.rows,
    });
  } catch (err) {
    console.error("Error checking attendance:", err);
    res.status(500).json({ error: "Failed to check attendance records" });
  }
});

/**
 * GET /api/attendance/assigned-classes
 * Return classes assigned to the currently logged-in teacher
 */
attendanceRouter.get("/assigned-classes", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const school_id = req.user?.school_id || "SCH-001";
  const teacherName = req.user?.name || "";
  const teacherId = req.user?.id;
  const isTeacher = req.user?.role === "teacher";

  try {
    let rows: any[] = [];

    if (isTeacher && teacherId) {
      // Find classes assigned to the teacher (either as class teacher or in timetable slots)
      const result = await query(
        `SELECT DISTINCT ON (class_id) *, class_id AS id 
         FROM get_teacher_timetables($1, $2)
         ORDER BY class_id, grade, section`,
        [teacherId, school_id]
      );
      rows = result.rows;

      // If no published timetables found, fallback to just class teacher matches
      if (rows.length === 0 && teacherName) {
        const fallbackResult = await query(
          `SELECT * FROM classes 
           WHERE (school_id = $1 OR school_id IS NULL) AND teacher = $2
           ORDER BY grade, section`,
          [school_id, teacherName]
        );
        rows = fallbackResult.rows;
      }
    }

    // Fallback: If still empty or non-teacher role, return all classes for the school
    if (rows.length === 0) {
      const allResult = await query(
        `SELECT * FROM classes WHERE school_id = $1 OR school_id IS NULL ORDER BY grade, section`,
        [school_id]
      );
      rows = allResult.rows;
    }

    res.json(rows);
  } catch (err) {
    console.error("Error fetching assigned classes:", err);
    res.status(500).json({ error: "Failed to fetch assigned classes" });
  }
});

/**
 * GET /api/attendance
 * Query Params: class_name, date, period
 */
attendanceRouter.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const school_id = req.user?.school_id || "SCH-001";
  const className = (req.query.class_name as string) || "";
  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const period = (req.query.period as string) || "Period 4";

  try {
    const result = await query(
      `SELECT * FROM attendance 
       WHERE school_id = $1 AND class_name = $2 AND academic_date = $3 AND period = $4
       ORDER BY roll ASC, student_name ASC`,
      [school_id, className, dateStr, period]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

/**
 * GET /api/attendance/marked-today
 * Returns distinct periods that have been marked today by the logged in user
 */

/**
 * GET /api/attendance/summary
 * General summary stats
 */
attendanceRouter.get("/summary", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const school_id = req.user?.school_id || "SCH-001";
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const classesResult = await query(
      `SELECT COUNT(DISTINCT class_name) as marked_classes FROM attendance WHERE school_id = $1 AND academic_date = $2`,
      [school_id, todayStr]
    );

    const countsResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late
       FROM attendance WHERE school_id = $1 AND academic_date = $2`,
      [school_id, todayStr]
    );

    const markedClasses = parseInt(classesResult.rows[0]?.marked_classes || "0", 10);
    const total = parseInt(countsResult.rows[0]?.total || "0", 10);
    const present = parseInt(countsResult.rows[0]?.present || "0", 10);
    const absent = parseInt(countsResult.rows[0]?.absent || "0", 10);
    const late = parseInt(countsResult.rows[0]?.late || "0", 10);

    const averagePercent = total > 0 ? ((present / total) * 100).toFixed(1) : "94.2";

    res.json({
      markedToday: `${markedClasses} / 62 classes`,
      averagePercent: `${averagePercent}%`,
      absentCount: absent,
      lateCount: late,
      totalMarkedToday: total,
      presentToday: present,
    });
  } catch (err) {
    console.error("Error fetching attendance summary:", err);
    res.status(500).json({ error: "Failed to fetch attendance summary" });
  }
});

/**
 * POST /api/attendance
 * Save attendance records for a class & date & period (INSERT / UPSERT)
 */
attendanceRouter.post("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const school_id = req.user?.school_id || "SCH-001";
  const markedBy = req.user?.name || "Teacher";

  const { class_name, date, period = "Period 4", records } = req.body;

  if (!class_name || !date || !Array.isArray(records)) {
    res.status(400).json({
      error: "class_name, date, and records (array of student attendance) are required.",
    });
    return;
  }

  try {
    await query("BEGIN");

    const upsertedRecords = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    for (const item of records) {
      const { student_id, student_name, roll, status } = item;
      if (!student_id || !status) continue;

      const normStatus = String(status).toUpperCase();
      if (normStatus === "PRESENT") presentCount++;
      else if (normStatus === "ABSENT") absentCount++;
      else if (normStatus === "LATE") lateCount++;

      const resRow = await query(
        `INSERT INTO attendance (school_id, class_name, academic_date, period, student_id, student_name, roll, status, marked_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (school_id, class_name, academic_date, period, student_id)
         DO UPDATE SET
           status = EXCLUDED.status,
           student_name = EXCLUDED.student_name,
           roll = EXCLUDED.roll,
           marked_by = EXCLUDED.marked_by,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          school_id,
          class_name,
          date,
          period,
          student_id,
          student_name || "Student",
          roll ? parseInt(String(roll), 10) : 0,
          normStatus,
          markedBy,
        ]
      );

      upsertedRecords.push(resRow.rows[0]);
    }

    await query("COMMIT");

    res.status(200).json({
      message: "Attendance saved successfully!",
      class_name,
      date,
      period,
      savedCount: upsertedRecords.length,
      stats: {
        total: upsertedRecords.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
      records: upsertedRecords,
    });
  } catch (err) {
    await query("ROLLBACK");
    console.error("Error saving attendance:", err);
    res.status(500).json({ error: "Failed to save attendance records in database" });
  }
});

/**
 * PUT /api/attendance
 * Update existing attendance records for a class & date & period
 */
attendanceRouter.put("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const school_id = req.user?.school_id || "SCH-001";
  const markedBy = req.user?.name || "Teacher";

  const { class_name, date, period = "Period 4", records } = req.body;

  if (!class_name || !date || !Array.isArray(records)) {
    res.status(400).json({
      error: "class_name, date, and records (array of student attendance) are required.",
    });
    return;
  }

  try {
    await query("BEGIN");

    const updatedRecords = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    for (const item of records) {
      const { student_id, student_name, roll, status } = item;
      if (!student_id || !status) continue;

      const normStatus = String(status).toUpperCase();
      if (normStatus === "PRESENT") presentCount++;
      else if (normStatus === "ABSENT") absentCount++;
      else if (normStatus === "LATE") lateCount++;

      const resRow = await query(
        `INSERT INTO attendance (school_id, class_name, academic_date, period, student_id, student_name, roll, status, marked_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (school_id, class_name, academic_date, period, student_id)
         DO UPDATE SET
           status = EXCLUDED.status,
           student_name = EXCLUDED.student_name,
           roll = EXCLUDED.roll,
           marked_by = EXCLUDED.marked_by,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          school_id,
          class_name,
          date,
          period,
          student_id,
          student_name || "Student",
          roll ? parseInt(String(roll), 10) : 0,
          normStatus,
          markedBy,
        ]
      );

      updatedRecords.push(resRow.rows[0]);
    }

    await query("COMMIT");

    res.status(200).json({
      message: "Attendance updated successfully!",
      class_name,
      date,
      period,
      savedCount: updatedRecords.length,
      stats: {
        total: updatedRecords.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
      records: updatedRecords,
    });
  } catch (err) {
    await query("ROLLBACK");
    console.error("Error updating attendance:", err);
    res.status(500).json({ error: "Failed to update attendance records in database" });
  }
});
