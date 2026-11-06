import { OrganizationRepository } from "./organization.repository.js";
import { CreateOrganizationPayload } from "./organization.types.js";

export class OrganizationService {
  constructor(private readonly repository = new OrganizationRepository()) {}

  async getOrganizations() {
    return this.repository.listOrganizations();
  }

  async createOrganization(payload: CreateOrganizationPayload) {
    if (!payload.name || !payload.shortName) {
      throw new Error("Missing required organization fields (name, shortName)");
    }
    return this.repository.createOrganization(payload);
  }

  async updateOrganization(id: string, payload: Partial<CreateOrganizationPayload>) {
    return this.repository.updateOrganization(id, payload);
  }

  async deleteOrganization(id: string) {
    return this.repository.deleteOrganization(id);
  }
}
