export interface ClassRecord {
  id: string;
  grade: string;
  section: string | null;
  batch: string | null;
  academic_year: string;
  campus: string;
  code: string;
  teacher: string | null;
  room: string | null;
  students_count: number;
  school_id: string;
  created_at: Date;
}

export interface CreateClassPayload {
  id?: string;
  grade: string;
  section?: string | null;
  batch?: string | null;
  academic_year: string;
  campus: string;
  code: string;
  teacher?: string | null;
  room?: string | null;
  students_count?: number;
}
