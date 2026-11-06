import { DepartmentsRepository } from "./departments.repository.js";
import { CreateDepartmentPayload } from "./departments.types.js";
import { isSuperAdmin } from "../../utils/request.js";

export class DepartmentsService {
  constructor(private readonly repository = new DepartmentsRepository()) {}

  async getDepartments(user?: { role?: string | null; school_id?: string | null }) {
    return this.repository.listDepartments(user?.school_id ?? null, isSuperAdmin(user));
  }

  async createDepartment(payload: CreateDepartmentPayload, user?: { school_id?: string | null }) {
    if (!payload.name || !payload.code || !payload.category) {
      throw new Error("Missing required department fields (name, code, category)");
    }
    const schoolId = user?.school_id || "SCH-001";
    return this.repository.createDepartment(payload, schoolId);
  }

  async updateDepartment(id: string, payload: Partial<CreateDepartmentPayload>, user?: { school_id?: string | null }) {
    const schoolId = user?.school_id || "SCH-001";
    return this.repository.updateDepartment(id, payload, schoolId);
  }

  async deleteDepartment(id: string, user?: { school_id?: string | null }) {
    const schoolId = user?.school_id || "SCH-001";
    return this.repository.deleteDepartment(id, schoolId);
  }
}
