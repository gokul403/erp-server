export interface StaffRecord {
  id: string;
  name: string;
  role: string;
  dept: string;
  phone: string;
  joined: string;
  status: string;
  school_id: string;
  email?: string | null;
  address?: string | null;
  metadata?: any | null;
  login_created?: boolean;
}

export interface CreateStaffPayload {
  id: string;
  name: string;
  role: string;
  dept: string;
  phone: string;
  joined?: string;
  status?: string;
  provideLogin?: boolean | string;
  email?: string;
  password?: string;
  address?: string;
  designation?: string;
  [key: string]: any;
}
