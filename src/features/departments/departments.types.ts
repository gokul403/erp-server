export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  head_id: string | null;
  category: string;
  status: string;
  school_id: string;
  created_at: Date;
  head_name?: string | null;
  staff_count?: number;
  classes?: string[] | any;
}

export interface CreateDepartmentPayload {
  id?: string;
  name: string;
  code: string;
  head_id: string | null;
  category: string;
  status?: string;
  classes?: string[] | any;
}
