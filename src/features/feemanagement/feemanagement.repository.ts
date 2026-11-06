import { query } from "../../config/database/postgres.js";
import { FeeAllocationRecord } from "./feemanagement.types.js";

export class FeeManagementRepository {
  private async ensureFeeAllocationsTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS fee_allocations (
          id VARCHAR(50) PRIMARY KEY,
          class_label VARCHAR(100) NOT NULL,
          component_id VARCHAR(50) NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.error("Error in ensureFeeAllocationsTable:", err);
    }
  }

  async listAllocations(): Promise<FeeAllocationRecord[]> {
    await this.ensureFeeAllocationsTable();
    const sql = `SELECT * FROM fee_allocations ORDER BY created_at ASC`;
    const result = await query(sql);
    
    // Seed default allocations if table is empty
    if (result.rows.length === 0) {
      const DEFAULT_ALLOCATIONS = [
        { id: "FA-01", class_label: "Grade 10", component_id: "FC-01", amount: 45000 },
        { id: "FA-02", class_label: "Grade 10", component_id: "FC-02", amount: 15000 },
        { id: "FA-03", class_label: "Grade 10", component_id: "FC-03", amount: 1000 },
        { id: "FA-04", class_label: "Grade 10", component_id: "FC-04", amount: 2500 },
        { id: "FA-05", class_label: "Grade 9", component_id: "FC-01", amount: 38000 },
        { id: "FA-06", class_label: "Grade 9", component_id: "FC-02", amount: 12000 },
        { id: "FA-07", class_label: "Grade 9", component_id: "FC-03", amount: 1000 },
        { id: "FA-08", class_label: "Grade 9", component_id: "FC-04", amount: 2000 },
        { id: "FA-09", class_label: "Class 5", component_id: "FC-01", amount: 25000 },
        { id: "FA-10", class_label: "Class 5", component_id: "FC-02", amount: 8000 },
        { id: "FA-11", class_label: "Class 5", component_id: "FC-03", amount: 1000 },
        { id: "FA-12", class_label: "Class 5", component_id: "FC-04", amount: 1500 },
      ];
      
      await query("BEGIN");
      try {
        for (const da of DEFAULT_ALLOCATIONS) {
          await query(
            `INSERT INTO fee_allocations (id, class_label, component_id, amount) VALUES ($1, $2, $3, $4)`,
            [da.id, da.class_label, da.component_id, da.amount]
          );
        }
        await query("COMMIT");
      } catch (err) {
        await query("ROLLBACK");
        console.error("Error seeding default allocations:", err);
      }
      
      const reResult = await query(sql);
      return reResult.rows as FeeAllocationRecord[];
    }
    
    return result.rows as FeeAllocationRecord[];
  }

  async saveAllocations(
    classLabel: string, 
    allocations: { id?: string; componentId: string; amount: number }[]
  ): Promise<FeeAllocationRecord[]> {
    await this.ensureFeeAllocationsTable();

    await query("BEGIN");
    try {
      // 1. Delete all existing allocations for this class
      await query(`DELETE FROM fee_allocations WHERE class_label = $1`, [classLabel]);

      // 2. Insert new allocations
      for (const a of allocations) {
        let allocationId = a.id;
        if (!allocationId || !allocationId.startsWith("FA-")) {
          allocationId = `FA-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        await query(
          `INSERT INTO fee_allocations (id, class_label, component_id, amount)
           VALUES ($1, $2, $3, $4)`,
          [allocationId, classLabel, a.componentId, a.amount]
        );
      }

      await query("COMMIT");
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }

    return this.listAllocations();
  }
}
