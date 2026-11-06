import { query } from "../../config/database/postgres.js";
import { eventsRepository } from "./events.repository.js";
import { EventRecord, UpsertEventPayload } from "./events.types.js";

export class EventsService {
  private async checkTeacherPublishPermission(userId: string): Promise<boolean> {
    const userRes = await query("SELECT role, metadata FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length === 0) return false;
    const user = userRes.rows[0];
    if (user.role === "school_admin" || user.role === "super_admin") return true;
    return user.metadata?.canPublishEvents === true || user.metadata?.canPublishEvents === "true";
  }

  public async getEventsList(
    schoolId: string,
    userId: string,
    role: string,
    filters: any
  ): Promise<any[]> {
    const list = await eventsRepository.getEventsList(schoolId, filters);

    if (role === "teacher") {
      return list.filter(e => e.status === "Published" || e.created_by === userId);
    }
    return list;
  }

  public async getEventDetails(id: string, schoolId: string, userId: string, role: string): Promise<EventRecord> {
    const event = await eventsRepository.getEventDetails(id, schoolId);
    if (!event) throw new Error("Event not found");

    if (role === "teacher" && event.status !== "Published" && event.created_by !== userId) {
      throw new Error("Unauthorized: Access to this record is restricted");
    }
    return event;
  }

  public async getTeacherDashboardEvents(teacherId: string, schoolId: string): Promise<any[]> {
    return eventsRepository.getTeacherDashboardEvents(teacherId, schoolId);
  }

  public async createEvent(
    payload: UpsertEventPayload,
    schoolId: string,
    userId: string,
    role: string
  ): Promise<EventRecord | null> {
    if (payload.status === "Published" && role === "teacher") {
      const canPublish = await this.checkTeacherPublishPermission(userId);
      if (!canPublish) {
        throw new Error("Unauthorized: You do not have permission to publish events directly. Please save as Draft.");
      }
    }

    return eventsRepository.createEvent(payload, schoolId, userId);
  }

  public async updateEvent(
    id: string,
    payload: UpsertEventPayload,
    schoolId: string,
    userId: string,
    role: string
  ): Promise<EventRecord | null> {
    const existing = await eventsRepository.getEventDetails(id, schoolId);
    if (!existing) throw new Error("Event not found");

    if (role === "teacher") {
      if (existing.created_by !== userId) {
        throw new Error("Unauthorized: You can only edit your own event records");
      }
      if (payload.status === "Published") {
        const canPublish = await this.checkTeacherPublishPermission(userId);
        if (!canPublish) {
          throw new Error("Unauthorized: You do not have permission to publish events");
        }
      }
    }

    return eventsRepository.updateEvent(id, payload, schoolId, userId);
  }

  public async deleteEvent(id: string, schoolId: string, userId: string, role: string): Promise<boolean> {
    const existing = await eventsRepository.getEventDetails(id, schoolId);
    if (!existing) throw new Error("Event not found");

    if (role === "teacher") {
      if (existing.created_by !== userId) {
        throw new Error("Unauthorized: You can only delete your own records");
      }
      if (existing.status !== "Draft") {
        throw new Error("Unauthorized: Teachers can only delete Draft records. Published/Archived events must be managed by an administrator.");
      }
    }

    return eventsRepository.deleteEvent(id, schoolId);
  }

  public async publishEvent(id: string, schoolId: string, userId: string, role: string): Promise<boolean> {
    const existing = await eventsRepository.getEventDetails(id, schoolId);
    if (!existing) throw new Error("Event not found");

    if (role === "teacher") {
      if (existing.created_by !== userId) {
        throw new Error("Unauthorized: You can only publish your own records");
      }
      const canPublish = await this.checkTeacherPublishPermission(userId);
      if (!canPublish) {
        throw new Error("Unauthorized: You do not have permission to publish events");
      }
    }

    return eventsRepository.setEventStatus(id, "Published", schoolId, userId);
  }

  public async archiveEvent(id: string, schoolId: string, userId: string, role: string): Promise<boolean> {
    const existing = await eventsRepository.getEventDetails(id, schoolId);
    if (!existing) throw new Error("Event not found");

    if (role === "teacher" && existing.created_by !== userId) {
      throw new Error("Unauthorized: You can only archive your own records");
    }

    return eventsRepository.setEventStatus(id, "Archived", schoolId, userId);
  }
}
export const eventsService = new EventsService();
