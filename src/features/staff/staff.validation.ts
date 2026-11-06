import { AppError } from "../../utils/errors.js";
import { CreateStaffPayload } from "./staff.types.js";

export function validateCreateStaffPayload(payload: CreateStaffPayload): void {
  if (!payload.id || !payload.name || !payload.role || !payload.dept || !payload.phone) {
    throw new AppError("Staff id, name, role, department, and phone are required", 400);
  }
}
