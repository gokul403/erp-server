import { FeeManagementRepository } from "./feemanagement.repository.js";
import { SaveFeeAllocationsPayload } from "./feemanagement.types.js";

export class FeeManagementService {
  constructor(private readonly repository = new FeeManagementRepository()) {}

  async getAllocations() {
    return this.repository.listAllocations();
  }

  async saveAllocations(payload: SaveFeeAllocationsPayload) {
    if (!payload.classLabel) {
      throw new Error("Missing required field classLabel");
    }
    if (!Array.isArray(payload.allocations)) {
      throw new Error("Allocations must be an array");
    }
    return this.repository.saveAllocations(payload.classLabel, payload.allocations);
  }
}
