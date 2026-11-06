export interface OrganizationRecord {
  id: string;
  name: string;
  short_name: string;
  org_type: string;
  org_code: string;
  primary_email: string;
  phone_number: string;
  website_url: string;
  logo_url: string;
  icon_url: string;
  academic_year: string;
  curriculum: string;
  created_at: Date;
}

export interface CreateOrganizationPayload {
  id?: string;
  name: string;
  shortName: string;
  orgType: string;
  orgCode: string;
  primaryEmail: string;
  phoneNumber: string;
  websiteUrl: string;
  logoUrl: string;
  iconUrl: string;
  academicYear?: string;
  curriculum?: string;
}
