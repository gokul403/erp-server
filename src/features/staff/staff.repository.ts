import bcrypt from "bcryptjs";
import { query } from "../../config/database/postgres.js";
import { CreateStaffPayload, StaffRecord } from "./staff.types.js";

export class StaffRepository {
  private async ensureUsersSchema(): Promise<void> {
    try {
      // 0. Migrate users.id from integer to VARCHAR if necessary
      try {
        const idTypeRes = await query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'id'
        `);
        if (idTypeRes.rows.length > 0 && idTypeRes.rows[0].data_type === 'integer') {
          console.log("Migrating users.id from integer to VARCHAR(50)...");
          await query(`
            ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_head_id_fkey;
            ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(50);
            ALTER TABLE departments ADD CONSTRAINT departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL;
          `);
          console.log("users.id successfully migrated to VARCHAR(50)!");
        }
      } catch (err) {
        console.error("Failed to migrate users.id column type:", err);
      }

      // 1. Add new columns to users if they don't exist
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type INTEGER;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS joined DATE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_logging BOOLEAN DEFAULT FALSE;
      `);

      // 2. Set default user_type for existing users
      await query(`
        UPDATE users SET user_type = 1 WHERE user_type IS NULL AND (role LIKE '%admin%');
        UPDATE users SET user_type = 2 WHERE user_type IS NULL AND (role LIKE '%teacher%' OR role LIKE '%instructor%');
        UPDATE users SET user_type = 4 WHERE user_type IS NULL AND (role LIKE '%principal%' OR role LIKE '%librarian%' OR role LIKE '%student%');
        UPDATE users SET user_type = 2 WHERE user_type IS NULL;
      `);

      // 3. Set custom_role for existing users
      await query(`
        UPDATE users SET custom_role = 'Super Admin' WHERE custom_role IS NULL AND role = 'super_admin';
        UPDATE users SET custom_role = 'School Admin' WHERE custom_role IS NULL AND role = 'school_admin';
        UPDATE users SET custom_role = 'Principal' WHERE custom_role IS NULL AND role = 'principal';
        UPDATE users SET custom_role = 'Teacher' WHERE custom_role IS NULL AND role = 'teacher';
        UPDATE users SET custom_role = 'Student' WHERE custom_role IS NULL AND role = 'student';
        UPDATE users SET custom_role = 'Librarian' WHERE custom_role IS NULL AND role = 'librarian';
        UPDATE users SET custom_role = INITCAP(REPLACE(role, '_', ' ')) WHERE custom_role IS NULL;
      `);

      // 4. Update departments foreign key references if necessary
      try {
        await query(`
          ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_head_id_fkey;
          ALTER TABLE departments ADD CONSTRAINT departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL;
        `);
      } catch (e) {
        // Safe to ignore if table structure differs
      }

    } catch (err) {
      console.error("Error migrating users schema in ensureUsersSchema:", err);
    }
  }

  private mapRowToStaffRecord(row: any): StaffRecord {
    return {
      id: row.id,
      name: row.name,
      role: row.custom_role || row.role, // Use custom role (e.g. Mathematics Teacher) if present
      dept: row.dept,
      phone: row.phone,
      joined: row.joined ? new Date(row.joined).toISOString().split('T')[0] : null,
      status: row.status,
      school_id: row.school_id,
      email: row.email,
      address: row.address,
      metadata: row.metadata || {},
      login_created: row.password_hash !== null
    } as any;
  }

  async listStaff(schoolId: string | null, isSuperAdmin: boolean): Promise<StaffRecord[]> {
    await this.ensureUsersSchema();
    const sql = isSuperAdmin
      ? "SELECT * FROM users WHERE user_type IN (1, 2, 4) ORDER BY name"
      : "SELECT * FROM users WHERE school_id = $1 AND user_type IN (1, 2, 4) ORDER BY name";
    
    const params = isSuperAdmin ? [] : [schoolId];
    const result = await query(sql, params);
    return result.rows.map(row => this.mapRowToStaffRecord(row));
  }

  async createStaff(payload: CreateStaffPayload, schoolId: string): Promise<StaffRecord> {
    await this.ensureUsersSchema();
    let passwordHash: string | null = null;

    if (payload.provideLogin === true || payload.provideLogin === "true") {
      if (!payload.email || !payload.password) {
        throw new Error("Email and password are required for login access");
      }
      
      // Case insensitive check
      const existing = await query("SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)", [payload.email.trim()]);
      if (existing.rows.length > 0) {
        throw new Error(`A user with email ${payload.email} already exists`);
      }

      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(payload.password, salt);
    }

    const metadata = {
      designation: payload.designation || "",
      gender: payload.gender || "",
      dob: payload.dob || "",
      bloodGroup: payload.bloodGroup || "A+",
      altPhone: payload.altPhone || "",
      subjectsTaught: payload.subjectsTaught || "",
      gradeLevels: payload.gradeLevels || "",
      weeklyHours: payload.weeklyHours || "24",
      degree: payload.degree || "",
      institution: payload.institution || "",
      gradYear: payload.gradYear || "",
      specialization: payload.specialization || "",
      examName: payload.examName || "",
      examYear: payload.examYear || "",
      examScore: payload.examScore || "",
      totalExperience: payload.totalExperience || "0",
      prevSchool: payload.prevSchool || "",
      prevRole: payload.prevRole || "",
      basicSalary: payload.basicSalary || "",
      allowances: payload.allowances || "",
      deductions: payload.deductions || "",
      bankAccount: payload.bankAccount || "",
      bankName: payload.bankName || "",
      ifscCode: payload.ifscCode || "",
      idProofType: payload.idProofType || "Aadhaar",
      idProofNumber: payload.idProofNumber || "",
      annualLeaves: payload.annualLeaves || "15",
      sickLeaves: payload.sickLeaves || "10",
      casualLeaves: payload.casualLeaves || "8",
    };

    // Deduce system role and user_type
    const roleLower = (payload.role || "").toLowerCase();
    let systemRole = "teacher";
    let userType = 2; // Default to Teacher

    if (roleLower.includes("admin")) {
      systemRole = "school_admin";
      userType = 1;
    } else if (roleLower.includes("principal") || roleLower.includes("head")) {
      systemRole = "principal";
      userType = 4;
    } else if (roleLower.includes("librarian")) {
      systemRole = "librarian";
      userType = 4;
    } else if (roleLower.includes("parent") || roleLower.includes("guardian")) {
      systemRole = "parent";
      userType = 3;
    }

    // Derive avatar initials
    const trimmed = (payload.name || "").trim();
    let avatar = "XX";
    if (trimmed) {
      const parts = trimmed.split(/\s+/);
      if (parts.length === 1) {
        avatar = parts[0].substring(0, 2).toUpperCase();
      } else {
        avatar = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
    }

    const emailVal = payload.email ? payload.email.toLowerCase().trim() : null;

    const result = await query(
      `INSERT INTO users (
         id, email, password_hash, role, custom_role, user_type, name, avatar, school_id,
         dept, phone, joined, status, address, metadata, is_logging
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE)
       RETURNING *`,
      [
        payload.id,
        emailVal,
        passwordHash,
        systemRole,
        payload.role, // custom role
        userType,
        payload.name,
        avatar,
        schoolId,
        payload.dept || null,
        payload.phone || null,
        payload.joined ? new Date(payload.joined) : new Date(),
        payload.status || "Active",
        payload.address || null,
        JSON.stringify(metadata)
      ]
    );

    return this.mapRowToStaffRecord(result.rows[0]);
  }

  async updateStaff(id: string, payload: Partial<CreateStaffPayload>, schoolId: string): Promise<StaffRecord> {
    await this.ensureUsersSchema();
    const metadata = {
      designation: payload.designation,
      gender: payload.gender,
      dob: payload.dob,
      bloodGroup: payload.bloodGroup,
      altPhone: payload.altPhone,
      subjectsTaught: payload.subjectsTaught,
      gradeLevels: payload.gradeLevels,
      weeklyHours: payload.weeklyHours,
      degree: payload.degree,
      institution: payload.institution,
      gradYear: payload.gradYear,
      specialization: payload.specialization,
      examName: payload.examName,
      examYear: payload.examYear,
      examScore: payload.examScore,
      totalExperience: payload.totalExperience,
      prevSchool: payload.prevSchool,
      prevRole: payload.prevRole,
      basicSalary: payload.basicSalary,
      allowances: payload.allowances,
      deductions: payload.deductions,
      bankAccount: payload.bankAccount,
      bankName: payload.bankName,
      ifscCode: payload.ifscCode,
      idProofType: payload.idProofType,
      idProofNumber: payload.idProofNumber,
      annualLeaves: payload.annualLeaves,
      sickLeaves: payload.sickLeaves,
      casualLeaves: payload.casualLeaves,
    };

    // Filter out undefined values from metadata to preserve existing values in the JSONB merge
    const cleanedMetadata: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        cleanedMetadata[key] = value;
      }
    }

    // Determine system role and user_type if role is updated
    let systemRole: string | undefined = undefined;
    let userType: number | undefined = undefined;

    if (payload.role !== undefined) {
      const roleLower = (payload.role || "").toLowerCase();
      systemRole = "teacher";
      userType = 2;
      if (roleLower.includes("admin")) {
        systemRole = "school_admin";
        userType = 1;
      } else if (roleLower.includes("principal") || roleLower.includes("head")) {
        systemRole = "principal";
        userType = 4;
      } else if (roleLower.includes("librarian")) {
        systemRole = "librarian";
        userType = 4;
      } else if (roleLower.includes("parent") || roleLower.includes("guardian")) {
        systemRole = "parent";
        userType = 3;
      }
    }

    // Check if password update is requested
    let passwordHashUpdate = "KEEP_CURRENT";
    let passwordHashVal: string | null = null;
    if (payload.provideLogin === false || payload.provideLogin === "false") {
      passwordHashUpdate = "SET_NULL";
    } else if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      passwordHashVal = await bcrypt.hash(payload.password, salt);
      passwordHashUpdate = "SET_VALUE";
    }

    let isLoggingUpdate = "KEEP_CURRENT";
    let isLoggingVal = false;
    if (payload.password || payload.provideLogin === false || payload.provideLogin === "false") {
      isLoggingUpdate = "SET_VALUE";
      isLoggingVal = false;
    }

    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         custom_role = COALESCE($2, custom_role),
         role = COALESCE($3, role),
         user_type = COALESCE($4, user_type),
         dept = COALESCE($5, dept),
         phone = COALESCE($6, phone),
         joined = COALESCE($7, joined),
         status = COALESCE($8, status),
         email = COALESCE($9, email),
         address = COALESCE($10, address),
         metadata = COALESCE(metadata, '{}'::jsonb) || $11::jsonb,
         password_hash = CASE WHEN $12 = 'KEEP_CURRENT' THEN password_hash WHEN $12 = 'SET_NULL' THEN NULL ELSE $13 END,
         is_logging = CASE WHEN $14 = 'KEEP_CURRENT' THEN is_logging ELSE $15::BOOLEAN END
       WHERE id = $16 AND school_id = $17
       RETURNING *`,
      [
        payload.name || null,
        payload.role || null, // custom role
        systemRole || null,
        userType || null,
        payload.dept || null,
        payload.phone || null,
        payload.joined ? new Date(payload.joined) : null,
        payload.status || null,
        payload.email ? payload.email.toLowerCase().trim() : null,
        payload.address || null,
        JSON.stringify(cleanedMetadata),
        passwordHashUpdate,
        passwordHashVal,
        isLoggingUpdate,
        isLoggingVal,
        id,
        schoolId,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Staff not found or unauthorized");
    }

    return this.mapRowToStaffRecord(result.rows[0]);
  }

  async deleteStaff(id: string, schoolId: string): Promise<void> {
    await this.ensureUsersSchema();
    const result = await query("DELETE FROM users WHERE id = $1 AND school_id = $2 AND user_type IN (1, 2, 4)", [id, schoolId]);
    if (result.rowCount === 0) {
      throw new Error("Staff not found or unauthorized");
    }
  }
}
