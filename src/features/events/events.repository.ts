import { query } from "../../config/database/postgres.js";
import { EventRecord, UpsertEventPayload } from "./events.types.js";

export class EventsRepository {
  constructor() {
    this.ensureEventsTables();
  }

  private async ensureEventsTables(): Promise<void> {
    try {
      // 1. Event Master Table
      await query(`
        CREATE TABLE IF NOT EXISTS events (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          school_id VARCHAR(50) NOT NULL,
          academic_year VARCHAR(50) NOT NULL,
          audience_type VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          start_time VARCHAR(50) NOT NULL,
          end_time VARCHAR(50) NOT NULL,
          venue VARCHAR(255),
          cover_image TEXT,
          external_link TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'Draft',
          created_by VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Event Audience Mapping Table
      await query(`
        CREATE TABLE IF NOT EXISTS event_audience_mapping (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(50) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          grade VARCHAR(100),
          class_id VARCHAR(50)
        )
      `);

      // 3. Event Attachments Table
      await query(`
        CREATE TABLE IF NOT EXISTS event_attachments (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(50) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          file_url TEXT NOT NULL
        )
      `);
    } catch (e) {
      console.error("Error creating events tables:", e);
    }
  }

  public async getEventDetails(eventId: string, schoolId: string): Promise<EventRecord | null> {
    const eventRes = await query(
      "SELECT * FROM events WHERE id = $1 AND (school_id = $2 OR $2 = 'SCH-001')",
      [eventId, schoolId]
    );
    if (eventRes.rows.length === 0) return null;
    const event = eventRes.rows[0];

    const attachRes = await query("SELECT file_name, file_url FROM event_attachments WHERE event_id = $1", [eventId]);
    event.attachments = attachRes.rows.map(r => ({ name: r.file_name, url: r.file_url }));

    const audRes = await query("SELECT grade, class_id FROM event_audience_mapping WHERE event_id = $1", [eventId]);
    event.audience = audRes.rows;

    const creatorRes = await query("SELECT name, role FROM users WHERE id = $1", [event.created_by]);
    if (creatorRes.rows.length > 0) {
      event.creator_name = creatorRes.rows[0].name;
      event.creator_role = creatorRes.rows[0].role;
    }

    return event as EventRecord;
  }

  public async getEventsList(
    schoolId: string,
    filters: {
      category?: string;
      status?: string;
      academic_year?: string;
      grade?: string;
      class_id?: string;
      start_date?: string;
      end_date?: string;
      created_by?: string;
      search?: string;
    }
  ): Promise<any[]> {
    let sql = `
      SELECT DISTINCT e.*
      FROM events e
      LEFT JOIN event_audience_mapping m ON e.id = m.event_id
      WHERE (e.school_id = $1 OR $1 = 'SCH-001')
    `;

    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (filters.category) {
      sql += ` AND e.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.status) {
      sql += ` AND e.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.academic_year) {
      sql += ` AND e.academic_year = $${paramIndex}`;
      params.push(filters.academic_year);
      paramIndex++;
    }

    if (filters.grade) {
      sql += ` AND m.grade = $${paramIndex}`;
      params.push(filters.grade);
      paramIndex++;
    }

    if (filters.class_id) {
      sql += ` AND m.class_id = $${paramIndex}`;
      params.push(filters.class_id);
      paramIndex++;
    }

    if (filters.start_date) {
      sql += ` AND e.start_date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      sql += ` AND e.end_date <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    if (filters.created_by) {
      sql += ` AND e.created_by = $${paramIndex}`;
      params.push(filters.created_by);
      paramIndex++;
    }

    if (filters.search) {
      sql += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.venue ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    sql += " ORDER BY e.created_at DESC";

    const res = await query(sql, params);
    const events = res.rows;

    for (const event of events) {
      const attachRes = await query("SELECT file_name, file_url FROM event_attachments WHERE event_id = $1", [event.id]);
      event.attachments = attachRes.rows.map(r => ({ name: r.file_name, url: r.file_url }));

      const audRes = await query("SELECT grade, class_id FROM event_audience_mapping WHERE event_id = $1", [event.id]);
      event.audience = audRes.rows;

      const creatorRes = await query("SELECT name, role FROM users WHERE id = $1", [event.created_by]);
      if (creatorRes.rows.length > 0) {
        event.creator_name = creatorRes.rows[0].name;
        event.creator_role = creatorRes.rows[0].role;
      }
    }

    return events;
  }

  public async getTeacherDashboardEvents(
    teacherId: string,
    schoolId: string
  ): Promise<any[]> {
    const userRes = await query("SELECT name FROM users WHERE id::text = $1::text", [teacherId]);
    if (userRes.rows.length === 0) return [];
    const teacherName = userRes.rows[0].name;

    const classRes = await query(`
      SELECT DISTINCT c.id AS class_id, c.grade
      FROM classes c
      LEFT JOIN class_timetables t ON c.id = t.class_id AND t.status = 'Published'
      WHERE c.teacher = $1
         OR EXISTS (
            SELECT 1 
            FROM jsonb_each(t.slots) AS slots_each(key, val)
            WHERE val->>'teacher' = $1
         )
    `, [teacherName]);

    const assignedGrades = Array.from(new Set(classRes.rows.map(r => r.grade).filter(Boolean)));
    const assignedClassIds = Array.from(new Set(classRes.rows.map(r => r.class_id).filter(Boolean)));

    let sql = `
      SELECT DISTINCT e.*
      FROM events e
      LEFT JOIN event_audience_mapping m ON e.id = m.event_id
      WHERE e.status = 'Published'
        AND e.end_date >= CURRENT_DATE
        AND (e.school_id = $1 OR $1 = 'SCH-001')
        AND (
          e.audience_type = 'Entire School'
    `;

    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (assignedGrades.length > 0) {
      sql += ` OR (e.audience_type = 'Grade' AND m.grade = ANY($${paramIndex}))`;
      params.push(assignedGrades);
      paramIndex++;
    }

    if (assignedClassIds.length > 0) {
      sql += ` OR (e.audience_type = 'Section' AND m.class_id = ANY($${paramIndex}))`;
      params.push(assignedClassIds);
      paramIndex++;
    }

    sql += ` ) ORDER BY e.start_date ASC`;

    const eventsRes = await query(sql, params);
    const events = eventsRes.rows;

    for (const event of events) {
      const attachRes = await query("SELECT file_name, file_url FROM event_attachments WHERE event_id = $1", [event.id]);
      event.attachments = attachRes.rows.map(r => ({ name: r.file_name, url: r.file_url }));

      const audRes = await query("SELECT grade, class_id FROM event_audience_mapping WHERE event_id = $1", [event.id]);
      event.audience = audRes.rows;

      const creatorRes = await query("SELECT name, role FROM users WHERE id = $1", [event.created_by]);
      if (creatorRes.rows.length > 0) {
        event.creator_name = creatorRes.rows[0].name;
        event.creator_role = creatorRes.rows[0].role;
      }
    }

    return events;
  }

  public async createEvent(
    payload: UpsertEventPayload,
    schoolId: string,
    userId: string
  ): Promise<EventRecord | null> {
    const id = `EV-${Date.now()}`;
    await query(
      `INSERT INTO events (
        id, title, category, description, school_id, academic_year, audience_type,
        start_date, end_date, start_time, end_time, venue, cover_image, external_link, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        payload.title,
        payload.category,
        payload.description,
        schoolId,
        payload.academic_year,
        payload.audience_type,
        payload.start_date,
        payload.end_date,
        payload.start_time,
        payload.end_time,
        payload.venue,
        payload.cover_image || null,
        payload.external_link || null,
        payload.status || "Draft",
        userId
      ]
    );

    if (payload.audience_type === "Grade" && payload.target_grades) {
      for (const grade of payload.target_grades) {
        await query(
          "INSERT INTO event_audience_mapping (event_id, grade) VALUES ($1, $2)",
          [id, grade]
        );
      }
    } else if (payload.audience_type === "Section" && payload.target_class_ids) {
      for (const classId of payload.target_class_ids) {
        const classRes = await query("SELECT grade FROM classes WHERE id = $1", [classId]);
        const grade = classRes.rows[0]?.grade || null;
        await query(
          "INSERT INTO event_audience_mapping (event_id, grade, class_id) VALUES ($1, $2, $3)",
          [id, grade, classId]
        );
      }
    }

    if (payload.attachments) {
      for (const att of payload.attachments) {
        await query(
          "INSERT INTO event_attachments (event_id, file_name, file_url) VALUES ($1, $2, $3)",
          [id, att.file_name, att.file_url]
        );
      }
    }

    return this.getEventDetails(id, schoolId);
  }

  public async updateEvent(
    id: string,
    payload: UpsertEventPayload,
    schoolId: string,
    userId: string
  ): Promise<EventRecord | null> {
    await query(
      `UPDATE events SET
        title = $1, category = $2, description = $3, academic_year = $4, audience_type = $5,
        start_date = $6, end_date = $7, start_time = $8, end_time = $9, venue = $10,
        cover_image = $11, external_link = $12, status = $13, updated_by = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 AND (school_id = $16 OR $16 = 'SCH-001')`,
      [
        payload.title,
        payload.category,
        payload.description,
        payload.academic_year,
        payload.audience_type,
        payload.start_date,
        payload.end_date,
        payload.start_time,
        payload.end_time,
        payload.venue,
        payload.cover_image || null,
        payload.external_link || null,
        payload.status,
        userId,
        id,
        schoolId
      ]
    );

    await query("DELETE FROM event_audience_mapping WHERE event_id = $1", [id]);
    await query("DELETE FROM event_attachments WHERE event_id = $1", [id]);

    if (payload.audience_type === "Grade" && payload.target_grades) {
      for (const grade of payload.target_grades) {
        await query(
          "INSERT INTO event_audience_mapping (event_id, grade) VALUES ($1, $2)",
          [id, grade]
        );
      }
    } else if (payload.audience_type === "Section" && payload.target_class_ids) {
      for (const classId of payload.target_class_ids) {
        const classRes = await query("SELECT grade FROM classes WHERE id = $1", [classId]);
        const grade = classRes.rows[0]?.grade || null;
        await query(
          "INSERT INTO event_audience_mapping (event_id, grade, class_id) VALUES ($1, $2, $3)",
          [id, grade, classId]
        );
      }
    }

    if (payload.attachments) {
      for (const att of payload.attachments) {
        await query(
          "INSERT INTO event_attachments (event_id, file_name, file_url) VALUES ($1, $2, $3)",
          [id, att.file_name, att.file_url]
        );
      }
    }

    return this.getEventDetails(id, schoolId);
  }

  public async deleteEvent(id: string, schoolId: string): Promise<boolean> {
    const result = await query(
      "DELETE FROM events WHERE id = $1 AND (school_id = $2 OR $2 = 'SCH-001')",
      [id, schoolId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  public async setEventStatus(id: string, status: string, schoolId: string, userId: string): Promise<boolean> {
    const result = await query(
      "UPDATE events SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND (school_id = $4 OR $4 = 'SCH-001')",
      [status, userId, id, schoolId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
export const eventsRepository = new EventsRepository();
