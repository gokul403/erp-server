export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name: string;
  avatar: string;
  school_id: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}
