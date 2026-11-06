export interface ClassTimetableRecord {
  class_id: string;
  academic_year: string;
  term: string;
  status: "Draft" | "Published";
  periods: any[]; // JSON array of period configurations
  days: string[]; // JSON array of weekdays
  slots: Record<string, any>; // JSON object mapping "DayName-PeriodId" to cell content
  school_id: string | null;
  updated_at?: Date;
}

export interface UpsertClassTimetablePayload {
  class_id: string;
  academic_year: string;
  term: string;
  status?: "Draft" | "Published";
  periods?: any[];
  days?: string[];
  slots?: Record<string, any>;
}
