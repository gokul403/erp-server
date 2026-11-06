import { Router, Response } from "express";
import { query } from "../config/database/postgres.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { staffRouter } from "../features/staff/staff.routes.js";
import { departmentsRouter } from "../features/departments/departments.routes.js";
import { classesRouter } from "../features/classes/classes.routes.js";
import { classTimetablesRouter } from "../features/class_timetables/class_timetables.routes.js";
import { organizationRouter } from "../features/organization/organization.routes.js";
import { feemanagementRouter } from "../features/feemanagement/feemanagement.routes.js";
import { attendanceRouter } from "../features/attendance/attendance.routes.js";
import { eventsRouter } from "../features/events/events.routes.js";

export const apiRouter = Router();

// Apply auth middleware to all api routes
apiRouter.use(authenticateToken);

// --- SCHOOLS ---
apiRouter.get("/schools", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query("SELECT * FROM schools ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- USERS ---
apiRouter.get("/users", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query(`
        SELECT u.id, u.email, u.role, u.name, u.avatar, u.school_id, s.name as school, 'Active' as status
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        ORDER BY u.name
      `);
    } else {
      result = await query(`
        SELECT u.id, u.email, u.role, u.name, u.avatar, u.school_id, s.name as school, 'Active' as status
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        WHERE u.school_id = $1
        ORDER BY u.name
      `, [req.user?.school_id]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- STUDENTS ---
apiRouter.get("/students", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const gradeFilter = req.query.grade as string | undefined;
    const sectionFilter = req.query.section as string | undefined;
    let result;
    if (req.user?.role === "super_admin") {
      if (gradeFilter && sectionFilter) {
        result = await query(
          "SELECT * FROM students WHERE grade = $1 AND section = $2 ORDER BY roll ASC, name ASC",
          [gradeFilter, sectionFilter]
        );
      } else if (gradeFilter) {
        result = await query(
          "SELECT * FROM students WHERE grade = $1 ORDER BY roll ASC, name ASC",
          [gradeFilter]
        );
      } else {
        result = await query("SELECT * FROM students ORDER BY name");
      }
    } else {
      if (gradeFilter && sectionFilter) {
        result = await query(
          "SELECT * FROM students WHERE school_id = $1 AND grade = $2 AND section = $3 ORDER BY roll ASC, name ASC",
          [req.user?.school_id, gradeFilter, sectionFilter]
        );
      } else if (gradeFilter) {
        result = await query(
          "SELECT * FROM students WHERE school_id = $1 AND grade = $2 ORDER BY roll ASC, name ASC",
          [req.user?.school_id, gradeFilter]
        );
      } else {
        result = await query("SELECT * FROM students WHERE school_id = $1 ORDER BY name", [
          req.user?.school_id,
        ]);
      }
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});


apiRouter.post("/students", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    id,
    name,
    grade,
    section,
    roll,
    guardian,
    phone,
    status,
    email,
    dob,
    gender,
    address,
    blood_group,
    admission_date,
    aadhaar_passport,
    father_name,
    mother_name,
  } = req.body;
  const school_id = req.user?.school_id || "SCH-001";

  if (!name || !grade || !section || !roll || !guardian || !phone) {
    res.status(400).json({ error: "Name, grade, section, roll number, guardian name, and phone number are all required." });
    return;
  }

  const parsedRoll = parseInt(String(roll), 10);
  if (isNaN(parsedRoll)) {
    res.status(400).json({ error: "Roll number must be a valid integer." });
    return;
  }

  let studentId = id;
  if (!studentId) {
    try {
      const idResult = await query("SELECT id FROM students WHERE id LIKE 'STU-%'");
      let maxNum = 1000;
      for (const row of idResult.rows) {
        const numPart = row.id.substring(4); // e.g. "1042" from "STU-1042"
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      studentId = `STU-${maxNum + 1}`;
    } catch (dbErr) {
      console.error("Failed to generate student ID, using random fallback:", dbErr);
      studentId = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  try {
    const result = await query(
      `INSERT INTO students (id, name, grade, section, roll, guardian, phone, status, school_id, email, dob, gender, address, blood_group, admission_date, aadhaar_passport, father_name, mother_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        studentId,
        name,
        grade,
        section,
        parsedRoll,
        guardian,
        phone,
        status || "Active",
        school_id,
        email || null,
        dob || null,
        gender || null,
        address || null,
        blood_group || null,
        admission_date || null,
        aadhaar_passport || null,
        father_name || null,
        mother_name || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/students/bulk", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentsList = req.body;
  if (!Array.isArray(studentsList)) {
    res.status(400).json({ error: "Expected an array of students" });
    return;
  }

  const school_id = req.user?.school_id || "SCH-001";

  // Basic validation
  for (const student of studentsList) {
    const { name, grade, section, roll, guardian, phone } = student;
    if (!name || !grade || !section || !roll || !guardian || !phone) {
      res.status(400).json({ error: "All student fields (name, grade, section, roll, guardian, phone) are required." });
      return;
    }
  }

  try {
    const idResult = await query("SELECT id FROM students WHERE id LIKE 'STU-%'");
    let maxNum = 1000;
    for (const row of idResult.rows) {
      const numPart = row.id.substring(4); // e.g. "1042" from "STU-1042"
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }

    const insertedStudents = [];

    // Run inside a database transaction
    await query("BEGIN");

    for (const student of studentsList) {
      maxNum++;
      const studentId = `STU-${maxNum}`;
      const {
        name,
        grade,
        section,
        roll,
        guardian,
        phone,
        status,
        email,
        dob,
        gender,
        address,
        blood_group,
        admission_date,
        aadhaar_passport,
        father_name,
        mother_name,
      } = student;
      const parsedRoll = parseInt(String(roll), 10);

      const result = await query(
        `INSERT INTO students (id, name, grade, section, roll, guardian, phone, status, school_id, email, dob, gender, address, blood_group, admission_date, aadhaar_passport, father_name, mother_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
        [
          studentId,
          name,
          grade,
          section,
          isNaN(parsedRoll) ? 0 : parsedRoll,
          guardian,
          phone,
          status || "Active",
          school_id,
          email || null,
          dob || null,
          gender || null,
          address || null,
          blood_group || null,
          admission_date || null,
          aadhaar_passport || null,
          father_name || null,
          mother_name || null,
        ]
      );
      insertedStudents.push(result.rows[0]);
    }

    await query("COMMIT");
    res.status(201).json(insertedStudents);
  } catch (err) {
    await query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Database error during bulk upload" });
  }
});

// --- STAFF ---
apiRouter.use("/staff", staffRouter);

// --- DEPARTMENTS ---
apiRouter.use("/departments", departmentsRouter);

// --- CLASSES ---
apiRouter.use("/classes", classesRouter);

// --- CLASS TIMETABLES ---
apiRouter.use("/class-timetables", classTimetablesRouter);

// --- EVENTS & ANNOUNCEMENTS ---
apiRouter.use("/events", eventsRouter);

// --- ORGANIZATION ---
apiRouter.use("/organization", organizationRouter);

// --- FEE MANAGEMENT ---
apiRouter.use("/feemanagement", feemanagementRouter);

// --- ATTENDANCE ---
apiRouter.use("/attendance", attendanceRouter);

// --- ADMISSIONS ---
apiRouter.get("/admissions", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query("SELECT * FROM admissions ORDER BY applied_on DESC");
    } else {
      result = await query("SELECT * FROM admissions WHERE school_id = $1 ORDER BY applied_on DESC", [
        req.user?.school_id,
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/admissions", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    id,
    applicant,
    grade,
    applied_on,
    status,
    email,
    phone,
    guardian,
    dob,
    gender,
    address,
    prev_school,
    details,
  } = req.body;
  const school_id = req.user?.school_id || "SCH-001";

  if (!applicant || !grade) {
    res.status(400).json({ error: "Applicant name and grade are required" });
    return;
  }

  const applicationId = id || `ADM-2025-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const result = await query(
      `INSERT INTO admissions (
         id, applicant, grade, applied_on, status, school_id,
         email, phone, guardian, dob, gender, address, prev_school, details
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        applicationId,
        applicant,
        grade,
        applied_on || new Date(),
        status || "Pending",
        school_id,
        email || null,
        phone || null,
        guardian || null,
        dob || null,
        gender || null,
        address || null,
        prev_school || null,
        details ? JSON.stringify(details) : "{}",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.put("/admissions/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    status,
    applicant,
    grade,
    email,
    phone,
    guardian,
    dob,
    gender,
    address,
    prev_school,
    review_notes,
    reviewed_by,
    reviewed_at,
    details,
    enrollStudent,
  } = req.body;

  try {
    const currentReviewer = reviewed_by || (req.user?.name ? `${req.user.name} (${req.user.role})` : "Review Committee");
    const currentReviewedAt = reviewed_at || new Date();

    const result = await query(
      `UPDATE admissions 
       SET status = COALESCE($1, status), 
           applicant = COALESCE($2, applicant), 
           grade = COALESCE($3, grade),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           guardian = COALESCE($6, guardian),
           dob = COALESCE($7, dob),
           gender = COALESCE($8, gender),
           address = COALESCE($9, address),
           prev_school = COALESCE($10, prev_school),
           review_notes = COALESCE($11, review_notes),
           reviewed_by = CASE WHEN $1 IS NOT NULL THEN $12 ELSE reviewed_by END,
           reviewed_at = CASE WHEN $1 IS NOT NULL THEN $13 ELSE reviewed_at END,
           details = CASE WHEN $14::jsonb IS NOT NULL THEN $14::jsonb ELSE details END
       WHERE id = $15 RETURNING *`,
      [
        status,
        applicant,
        grade,
        email,
        phone,
        guardian,
        dob,
        gender,
        address,
        prev_school,
        review_notes,
        currentReviewer,
        currentReviewedAt,
        details ? JSON.stringify(details) : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Admission not found" });
      return;
    }

    const updated = result.rows[0];

    // Auto-enroll student into students table if requested and approved
    if (status === "Approved" && enrollStudent) {
      const existing = await query(
        "SELECT id FROM students WHERE LOWER(name) = LOWER($1) AND school_id = $2",
        [updated.applicant, updated.school_id || "SCH-001"]
      );

      if (existing.rows.length === 0) {
        // Generate STU-ID
        const idResult = await query("SELECT id FROM students WHERE id LIKE 'STU-%'");
        let maxNum = 1050;
        for (const row of idResult.rows) {
          const num = parseInt(row.id.substring(4), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        const newStudentId = `STU-${maxNum + 1}`;

        // Section default to A
        await query(
          `INSERT INTO students (
             id, name, grade, section, roll, guardian, phone, status, school_id,
             email, dob, gender, address, admission_date
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO NOTHING`,
          [
            newStudentId,
            updated.applicant,
            updated.grade,
            "A",
            Math.floor(1 + Math.random() * 40),
            updated.guardian || "Parent / Guardian",
            updated.phone || "Not specified",
            "Active",
            updated.school_id || "SCH-001",
            updated.email || null,
            updated.dob || null,
            updated.gender || "Male",
            updated.address || null,
            new Date(),
          ]
        );
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});


// --- FEES ---
apiRouter.get("/fees", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query("SELECT * FROM fees ORDER BY due DESC");
    } else {
      result = await query("SELECT * FROM fees WHERE school_id = $1 ORDER BY due DESC", [
        req.user?.school_id,
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/fees", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, student_name, grade, amount, due, status } = req.body;
  const school_id = req.user?.school_id || "SCH-001";

  if (!student_name || !grade || !amount || !due) {
    res.status(400).json({ error: "student_name, grade, amount, and due date are required" });
    return;
  }

  const invoiceId = id || `INV-${Math.floor(30000 + Math.random() * 9000)}`;

  try {
    const result = await query(
      `INSERT INTO fees (id, student_name, grade, amount, due, status, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [invoiceId, student_name, grade, amount, due, status || "Pending", school_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- TIMETABLE ---
apiRouter.get("/timetable", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query("SELECT * FROM timetable ORDER BY id");
    } else {
      result = await query("SELECT * FROM timetable WHERE school_id = $1 ORDER BY id", [
        req.user?.school_id,
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- BOOKS ---
apiRouter.get("/books", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query("SELECT * FROM books ORDER BY title");
    } else {
      result = await query("SELECT * FROM books WHERE school_id = $1 ORDER BY title", [
        req.user?.school_id,
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/books", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, title, author, category, copies, available } = req.body;
  const school_id = req.user?.school_id || "SCH-001";

  try {
    const result = await query(
      `INSERT INTO books (id, title, author, category, copies, available, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, title, author, category, copies, available, school_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- ISSUED BOOKS ---
apiRouter.get("/issued-books", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query("SELECT * FROM issued_books ORDER BY due DESC");
    } else {
      result = await query("SELECT * FROM issued_books WHERE school_id = $1 ORDER BY due DESC", [
        req.user?.school_id,
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/issued-books", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, book, student, grade, issued, due, status } = req.body;
  const school_id = req.user?.school_id || "SCH-001";

  try {
    const result = await query(
      `INSERT INTO issued_books (id, book, student, grade, issued, due, status, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, book, student, grade, issued, due, status || "Issued", school_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- ASSIGNMENTS ---
apiRouter.get("/assignments", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query("SELECT * FROM assignments ORDER BY due DESC");
    } else {
      result = await query("SELECT * FROM assignments WHERE school_id = $1 ORDER BY due DESC", [
        req.user?.school_id,
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/assignments", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, title, subject, class: className, due, submitted, total } = req.body;
  const school_id = req.user?.school_id || "SCH-001";

  try {
    const result = await query(
      `INSERT INTO assignments (id, title, subject, class, due, submitted, total, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, title, subject, className, due, submitted || 0, total, school_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- NOTIFICATIONS ---
apiRouter.get("/notifications", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let result;
    if (req.user?.role === "super_admin") {
      result = await query("SELECT * FROM notifications ORDER BY id DESC");
    } else {
      result = await query("SELECT * FROM notifications WHERE school_id = $1 ORDER BY id DESC", [
        req.user?.school_id,
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/notifications", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { title, time_ago, type } = req.body;
  const school_id = req.user?.school_id || "SCH-001";

  try {
    const result = await query(
      `INSERT INTO notifications (title, time_ago, type, school_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, time_ago || "Just now", type, school_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- SUBSCRIPTIONS ---
apiRouter.get("/subscriptions", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Subscriptions is platform level, only super_admin can see them
    if (req.user?.role !== "super_admin") {
      res.status(403).json({ error: "Unauthorized access" });
      return;
    }
    const result = await query("SELECT * FROM subscriptions ORDER BY school");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
