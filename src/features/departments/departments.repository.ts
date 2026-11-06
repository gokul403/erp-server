import { query } from "../../config/database/postgres.js";
import { DepartmentRecord, CreateDepartmentPayload } from "./departments.types.js";

export class DepartmentsRepository {
  private async ensureDepartmentsTable(): Promise<void> {
    try {
      // 1. Create table if not exists
      await query(`
        CREATE TABLE IF NOT EXISTS departments (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50) NOT NULL,
          head_id VARCHAR(50),
          category VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          school_id VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Add classes column if not exists
      await query(`
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS classes JSONB DEFAULT '[]'::jsonb
      `);

      // Table check is complete. Seeding has been removed to use only actual data.
    } catch (err) {
      console.error("Error in ensureDepartmentsTable:", err);
    }
  }

  async listDepartments(schoolId: string | null, isSuperAdmin: boolean): Promise<DepartmentRecord[]> {
    await this.ensureDepartmentsTable();
    
    // We fetch head_name and staff_count dynamically
    const sql = `
      SELECT 
        d.id, 
        d.name, 
        d.code, 
        d.head_id, 
        d.category, 
        d.status, 
        d.classes,
        d.school_id, 
        d.created_at,
        h.name as head_name,
        (SELECT COUNT(*) FROM users u WHERE u.dept = d.name AND u.user_type IN (1, 2, 4) AND (u.school_id = d.school_id OR d.school_id IS NULL)) as staff_count
      FROM departments d
      LEFT JOIN users h ON d.head_id = h.id::text
      WHERE d.school_id = $1 OR $2 = TRUE
      ORDER BY d.name
    `;
    const params = [schoolId, isSuperAdmin];
    const result = await query(sql, params);
    return result.rows as DepartmentRecord[];
  }

  async createDepartment(payload: CreateDepartmentPayload, schoolId: string): Promise<DepartmentRecord> {
    await this.ensureDepartmentsTable();

    // Generate unique ID if not provided
    let deptId = payload.id;
    if (!deptId) {
      const idResult = await query("SELECT id FROM departments WHERE id LIKE 'DEP-%'");
      let maxNum = 100;
      for (const row of idResult.rows) {
        const numPart = row.id.substring(4); // e.g. "001" from "DEP-001"
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      deptId = `DEP-${maxNum + 1}`;
    }

    const result = await query(
      `INSERT INTO departments (id, name, code, head_id, category, status, classes, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        deptId,
        payload.name,
        payload.code,
        payload.head_id || null,
        payload.category,
        payload.status || "Active",
        JSON.stringify(payload.classes || []),
        schoolId,
      ]
    );

    // Fetch the newly created record with head name and staff count
    const fetchSql = `
      SELECT 
        d.id, 
        d.name, 
        d.code, 
        d.head_id, 
        d.category, 
        d.status, 
        d.classes,
        d.school_id, 
        d.created_at,
        h.name as head_name,
        0 as staff_count
      FROM departments d
      LEFT JOIN users h ON d.head_id = h.id::text
      WHERE d.id = $1
    `;
    const fetchResult = await query(fetchSql, [deptId]);
    return fetchResult.rows[0] as DepartmentRecord;
  }

  async updateDepartment(id: string, payload: Partial<CreateDepartmentPayload>, schoolId: string): Promise<DepartmentRecord> {
    await this.ensureDepartmentsTable();
    
    const result = await query(
      `UPDATE departments SET
         name = COALESCE($1, name),
         code = COALESCE($2, code),
         head_id = $3,
         category = COALESCE($4, category),
         status = COALESCE($5, status),
         classes = COALESCE($6, classes)
       WHERE id = $7 AND (school_id = $8 OR $8 = 'SCH-001')
       RETURNING *`,
      [
        payload.name || null,
        payload.code || null,
        payload.head_id === undefined ? undefined : (payload.head_id || null),
        payload.category || null,
        payload.status || null,
        payload.classes === undefined ? undefined : JSON.stringify(payload.classes),
        id,
        schoolId,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Department not found or unauthorized");
    }

    const fetchSql = `
      SELECT 
        d.id, 
        d.name, 
        d.code, 
        d.head_id, 
        d.category, 
        d.status, 
        d.classes,
        d.school_id, 
        d.created_at,
        h.name as head_name,
        (SELECT COUNT(*) FROM users u WHERE u.dept = d.name AND u.user_type IN (1, 2, 4) AND (u.school_id = d.school_id OR d.school_id IS NULL)) as staff_count
      FROM departments d
      LEFT JOIN users h ON d.head_id = h.id::text
      WHERE d.id = $1
    `;
    const fetchResult = await query(fetchSql, [id]);
    return fetchResult.rows[0] as DepartmentRecord;
  }

  async deleteDepartment(id: string, schoolId: string): Promise<void> {
    await this.ensureDepartmentsTable();
    
    const result = await query(
      `DELETE FROM departments WHERE id = $1 AND (school_id = $2 OR $2 = 'SCH-001')`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      throw new Error("Department not found or unauthorized");
    }
  }
}
