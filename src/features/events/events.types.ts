export interface EventRecord {
  id: string;
  title: string;
  category: "Events" | "Announcements" | "Academic Activities";
  description: string;
  school_id: string;
  academic_year: string;
  audience_type: "Entire School" | "Grade" | "Section";
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  cover_image: string | null;
  external_link: string | null;
  status: "Draft" | "Published" | "Archived";
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  audience?: Array<{ grade?: string; class_id?: string }>;
  attachments?: Array<{ name: string; url: string }>;
  creator_name?: string;
  creator_role?: string;
}

export interface UpsertEventPayload {
  title: string;
  category: "Events" | "Announcements" | "Academic Activities";
  description: string;
  academic_year: string;
  audience_type: "Entire School" | "Grade" | "Section";
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  cover_image?: string | null;
  external_link?: string | null;
  status: "Draft" | "Published" | "Archived";
  target_grades?: string[];
  target_class_ids?: string[];
  attachments?: Array<{ file_name: string; file_url: string }>;
}
