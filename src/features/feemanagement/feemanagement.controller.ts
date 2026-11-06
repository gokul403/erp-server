import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { FeeManagementService } from "./feemanagement.service.js";
import { FeeAllocationRecord } from "./feemanagement.types.js";

function mapToResponse(row: FeeAllocationRecord) {
  return {
    id: row.id,
    classLabel: row.class_label,
    componentId: row.component_id,
    amount: typeof row.amount === "string" ? parseFloat(row.amount) : row.amount,
  };
}

export class FeeManagementController {
  constructor(private readonly service = new FeeManagementService()) {}

  listAllocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await this.service.getAllocations();
      res.json(records.map(mapToResponse));
    } catch (error) {
      next(error);
    }
  };

  saveAllocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await this.service.saveAllocations(req.body);
      res.json(records.map(mapToResponse));
    } catch (error) {
      next(error);
    }
  };
}
