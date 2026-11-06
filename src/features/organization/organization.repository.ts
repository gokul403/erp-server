import { query } from "../../config/database/postgres.js";
import { OrganizationRecord, CreateOrganizationPayload } from "./organization.types.js";

export class OrganizationRepository {
  private async ensureOrganizationTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS organization (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          short_name VARCHAR(100) NOT NULL,
          org_type VARCHAR(100),
          org_code VARCHAR(100),
          primary_email VARCHAR(255),
          phone_number VARCHAR(100),
          website_url VARCHAR(255),
          logo_url TEXT,
          icon_url TEXT,
          academic_year VARCHAR(50),
          curriculum VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.error("Error in ensureOrganizationTable:", err);
    }
  }

  async listOrganizations(): Promise<OrganizationRecord[]> {
    await this.ensureOrganizationTable();
    const sql = `SELECT * FROM organization ORDER BY created_at ASC`;
    const result = await query(sql);
    if (result.rows.length === 0) {
      await this.createOrganization({
        name: "Greenfield International School",
        shortName: "GIS",
        orgType: "School",
        orgCode: "GIS-2026-001",
        primaryEmail: "admin@greenfield.edu",
        phoneNumber: "+91 98765 43210",
        websiteUrl: "https://www.greenfield.edu",
        logoUrl: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/087cd519-a935-48a3-b585-06c4aab9b5d4/id-preview-32a584c6--3ded0584-63b1-45d8-a245-e6a80d597949.lovable.app-1782816054166.png",
        iconUrl: "",
        academicYear: "2025-26",
        curriculum: "CBSE",
      });
      const reResult = await query(sql);
      return reResult.rows as OrganizationRecord[];
    }
    return result.rows as OrganizationRecord[];
  }

  async createOrganization(payload: CreateOrganizationPayload): Promise<OrganizationRecord> {
    await this.ensureOrganizationTable();

    // Generate unique ID if not provided
    let orgId = payload.id;
    if (!orgId) {
      const idResult = await query("SELECT id FROM organization WHERE id LIKE 'ORG-%'");
      let maxNum = 100;
      for (const row of idResult.rows) {
        const numPart = row.id.substring(4); // e.g. "101" from "ORG-101"
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      orgId = `ORG-${maxNum + 1}`;
    }

    const result = await query(
      `INSERT INTO organization (id, name, short_name, org_type, org_code, primary_email, phone_number, website_url, logo_url, icon_url, academic_year, curriculum)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        orgId,
        payload.name,
        payload.shortName,
        payload.orgType || null,
        payload.orgCode || null,
        payload.primaryEmail || null,
        payload.phoneNumber || null,
        payload.websiteUrl || null,
        payload.logoUrl || null,
        payload.iconUrl || null,
        payload.academicYear || "2025-26",
        payload.curriculum || "CBSE",
      ]
    );

    return result.rows[0] as OrganizationRecord;
  }

  async updateOrganization(id: string, payload: Partial<CreateOrganizationPayload>): Promise<OrganizationRecord> {
    await this.ensureOrganizationTable();

    const result = await query(
      `UPDATE organization SET
         name = COALESCE($1, name),
         short_name = COALESCE($2, short_name),
         org_type = COALESCE($3, org_type),
         org_code = COALESCE($4, org_code),
         primary_email = COALESCE($5, primary_email),
         phone_number = COALESCE($6, phone_number),
         website_url = COALESCE($7, website_url),
         logo_url = COALESCE($8, logo_url),
         icon_url = COALESCE($9, icon_url),
         academic_year = COALESCE($10, academic_year),
         curriculum = COALESCE($11, curriculum)
       WHERE id = $12
       RETURNING *`,
      [
        payload.name !== undefined ? payload.name : null,
        payload.shortName !== undefined ? payload.shortName : null,
        payload.orgType !== undefined ? payload.orgType : null,
        payload.orgCode !== undefined ? payload.orgCode : null,
        payload.primaryEmail !== undefined ? payload.primaryEmail : null,
        payload.phoneNumber !== undefined ? payload.phoneNumber : null,
        payload.websiteUrl !== undefined ? payload.websiteUrl : null,
        payload.logoUrl !== undefined ? payload.logoUrl : null,
        payload.iconUrl !== undefined ? payload.iconUrl : null,
        payload.academicYear !== undefined ? payload.academicYear : null,
        payload.curriculum !== undefined ? payload.curriculum : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Organization not found");
    }

    return result.rows[0] as OrganizationRecord;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.ensureOrganizationTable();

    const result = await query(
      `DELETE FROM organization WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error("Organization not found");
    }
  }
}
