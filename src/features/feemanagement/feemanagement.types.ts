export interface FeeAllocationRecord {
  id: string;
  class_label: string;
  component_id: string;
  amount: number;
  created_at: Date;
}

export interface SaveFeeAllocationsPayload {
  classLabel: string;
  allocations: {
    id?: string;
    componentId: string;
    amount: number;
  }[];
}
