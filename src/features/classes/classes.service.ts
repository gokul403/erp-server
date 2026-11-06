import { ClassesRepository } from "./classes.repository.js";
import { CreateClassPayload } from "./classes.types.js";
import { isSuperAdmin } from "../../utils/request.js";

export class ClassesService {
  constructor(private readonly repository = new ClassesRepository()) {}

  async getClasses(user?: { role?: string | null; school_id?: string | null }) {
    return this.repository.listClasses(user?.school_id ?? null, isSuperAdmin(user));
  }

  async createClass(payload: CreateClassPayload, user?: { school_id?: string | null }) {
    if (!payload.grade || !payload.academic_year || !payload.campus || !payload.code) {
      throw new Error("Missing required class fields (grade, academic_year, campus, code)");
    }
    const schoolId = user?.school_id || "SCH-001";
    return this.repository.createClass(payload, schoolId);
  }

  async updateClass(id: string, payload: Partial<CreateClassPayload>, user?: { school_id?: string | null }) {
    const schoolId = user?.school_id || "SCH-001";
    return this.repository.updateClass(id, payload, schoolId);
  }

  async deleteClass(id: string, user?: { school_id?: string | null }) {
    const schoolId = user?.school_id || "SCH-001";
    return this.repository.deleteClass(id, schoolId);
  }
}
