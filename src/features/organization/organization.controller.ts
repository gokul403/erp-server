import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { OrganizationService } from "./organization.service.js";
import { OrganizationRecord } from "./organization.types.js";

function mapToResponse(row: OrganizationRecord) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    orgType: row.org_type,
    orgCode: row.org_code,
    primaryEmail: row.primary_email,
    phoneNumber: row.phone_number,
    websiteUrl: row.website_url,
    logoUrl: row.logo_url,
    iconUrl: row.icon_url,
    academicYear: row.academic_year,
    curriculum: row.curriculum,
  };
}

export class OrganizationController {
  constructor(private readonly service = new OrganizationService()) {}

  listOrganizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await this.service.getOrganizations();
      res.json(records.map(mapToResponse));
    } catch (error) {
      next(error);
    }
  };

  createOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.service.createOrganization(req.body);
      res.status(201).json(mapToResponse(record));
    } catch (error) {
      next(error);
    }
  };

  updateOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid organization id" });
        return;
      }
      const record = await this.service.updateOrganization(idParam, req.body);
      res.json(mapToResponse(record));
    } catch (error) {
      next(error);
    }
  };

  deleteOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        res.status(400).json({ error: "Invalid organization id" });
        return;
      }
      await this.service.deleteOrganization(idParam);
      res.json({ message: "Organization profile deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
}
