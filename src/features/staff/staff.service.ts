import { AppError } from "../../utils/errors.js";
import { isSuperAdmin } from "../../utils/request.js";
import { CreateStaffPayload } from "./staff.types.js";
import { StaffRepository } from "./staff.repository.js";
import { validateCreateStaffPayload } from "./staff.validation.js";

export class StaffService {
  constructor(private readonly staffRepository = new StaffRepository()) {}

  async getStaff(user?: { role?: string | null; school_id?: string | null }) {
    return this.staffRepository.listStaff(user?.school_id ?? null, isSuperAdmin(user));
  }

  async createStaff(payload: CreateStaffPayload, user?: { role?: string | null; school_id?: string | null }) {
    validateCreateStaffPayload(payload);

    const schoolId = user?.school_id || "SCH-001";

    try {
      return await this.staffRepository.createStaff(payload, schoolId);
    } catch (error: any) {
      console.error("Detailed Database Error in createStaff:", error);
      if (error.message && error.message.includes("already exists")) {
        throw new AppError(error.message, 400);
      }

      if (error.message && error.message.includes("Email and password")) {
        throw new AppError(error.message, 400);
      }

      throw new AppError(`Database error during staff registration: ${error.message}`, 500);
    }
  }

  async updateStaff(id: string, payload: Partial<CreateStaffPayload>, user?: { role?: string | null; school_id?: string | null }) {
    const schoolId = user?.school_id || "SCH-001";

    try {
      return await this.staffRepository.updateStaff(id, payload, schoolId);
    } catch (error: any) {
      if (error.message && error.message.includes("not found")) {
        throw new AppError(error.message, 404);
      }
      throw new AppError("Database error updating staff", 500);
    }
  }

  async deleteStaff(id: string, user?: { role?: string | null; school_id?: string | null }) {
    const schoolId = user?.school_id || "SCH-001";
    return this.staffRepository.deleteStaff(id, schoolId);
  }
}
